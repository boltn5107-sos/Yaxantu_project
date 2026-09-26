"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  User as UserIcon,
  MapPin,
  Bell,
  Shield,
  LogOut,
  Package,
  Heart,
  Loader2,
  Pencil,
  Trash2,
  Save,
  ChevronRight,
} from "lucide-react";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  updateSettings,
  mediaUrl,
  type Address,
  type AddressInput,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Section = "profile" | "addresses" | "notifications" | "security";

const sections = [
  { id: "profile", labelKey: "navigation.profileTitle", icon: UserIcon, descriptionKey: "navigation.profileDescription" },
  { id: "addresses", labelKey: "navigation.addressesTitle", icon: MapPin, descriptionKey: "navigation.addressesDescription" },
  { id: "notifications", labelKey: "navigation.notificationsTitle", icon: Bell, descriptionKey: "navigation.notificationsDescription" },
  { id: "security", labelKey: "navigation.securityTitle", icon: Shield, descriptionKey: "navigation.securityDescription" },
] as const;

const emptyAddress: AddressInput = {
  first_name: "",
  last_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state_province: "",
  country_code: "CM",
  phone: "",
  is_default: false,
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { user, loading, refresh, signOut } = useAuth();
  const [active, setActive] = useState<Section>("profile");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [form, setForm] = useState<AddressInput>({ ...emptyAddress });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notifOverride, setNotifOverride] = useState<{
    inapp: boolean;
    sms: boolean;
    voice: boolean;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const displayName = nameOverride ?? user?.name ?? "";

  const notifications = notifOverride ?? {
    inapp: user?.settings.notify_inapp ?? true,
    sms: user?.settings.notify_sms ?? true,
    voice: user?.settings.notify_voice ?? false,
  };

  useEffect(() => {
    if (active !== "addresses" || !user) return;
    let cancelled = false;
    getAddresses()
      .then((result) => {
        if (cancelled) return;
        setAddresses(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("addressesUnavailable"));
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, reload, t, user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setBusy("profile");
    setError(null);
    setNotice(null);
    try {
      await updateSettings({ name: displayName.trim() });
      setNameOverride(null);
      setNotice(t("profileSaved"));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setBusy(null);
    }
  };

  const toggleNotification = async (flag: "inapp" | "sms" | "voice", value: boolean) => {
    const key =
      flag === "inapp" ? "notify_inapp" : flag === "sms" ? "notify_sms" : "notify_voice";
    setNotifOverride((prev) => ({ ...(prev ?? notifications), [flag]: value }));
    setBusy(`notif-${flag}`);
    setError(null);
    setNotice(null);
    try {
      await updateSettings({ [key]: value });
      setNotifOverride(null);
      setNotice(t("notificationPreferencesSaved"));
      await refresh();
    } catch (err) {
      setNotifOverride((prev) => ({ ...(prev ?? notifications), [flag]: !value }));
      setError(err instanceof Error ? err.message : t("notificationUpdateError"));
    } finally {
      setBusy(null);
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address_line1.trim() || !form.city.trim()) return;
    setBusy(editingId ? `edit-${editingId}` : "create");
    setError(null);
    setNotice(null);
    try {
      const payload: AddressInput = {
        type: "shipping",
        first_name: form.first_name?.trim() || undefined,
        last_name: form.last_name?.trim() || undefined,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2?.trim() || undefined,
        city: form.city.trim(),
        state_province: form.state_province?.trim() || undefined,
        country_code: form.country_code || "CM",
        phone: form.phone?.trim() || undefined,
        is_default: form.is_default ?? false,
      };
      if (editingId) {
        await updateAddress(editingId, payload);
        setNotice(t("addressUpdated"));
      } else {
        await createAddress(payload);
        setNotice(t("addressSaved"));
      }
      setForm({ ...emptyAddress });
      setEditingId(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (address: Address) => {
    setEditingId(address.id);
    setForm({
      first_name: address.first_name ?? "",
      last_name: address.last_name ?? "",
      address_line1: address.address_line1,
      address_line2: address.address_line2 ?? "",
      city: address.city,
      state_province: address.state_province ?? "",
      country_code: address.country_code || "CM",
      phone: address.phone ?? "",
      is_default: address.is_default,
    });
  };

  const removeAddress = async (address: Address) => {
    if (!window.confirm(t("deleteAddressConfirm"))) return;
    setBusy(`delete-${address.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(await deleteAddress(address.id));
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setBusy(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("accountTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("accountSubtitle")}</p>
      </div>

      {notice && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(user.avatar) ?? ""}
                    alt={user.name ?? t("avatarAlt")}
                    className="h-12 w-12 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-lg font-semibold">
                    {(user.name ?? "?")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "Y"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600">{user.email ?? user.phone ?? "—"}</p>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {sections.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div>{t(item.labelKey)}</div>
                      <div className={`text-xs ${isActive ? "text-emerald-600" : "text-gray-500"}`}>
                        {t(item.descriptionKey)}
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => void signOut()}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t("signOut")}
              </button>
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-3">
          {active === "profile" && (
            <form onSubmit={saveProfile} className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">{t("profile.title")}</h2>
                <p className="text-sm text-gray-600">{t("profile.description")}</p>
              </div>
              <div className="flex items-center gap-4 mb-6">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(user.avatar) ?? ""}
                    alt={user.name ?? t("avatarAlt")}
                    className="h-16 w-16 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-semibold">
                    {(user.name ?? "?")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "Y"}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.fullNameLabel")}</label>
<input
                      value={displayName}
                      onChange={(e) => setNameOverride(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.emailLabel")}</label>
                  <input
                    value={user.email ?? ""}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.phoneLabel")}</label>
                  <input
                    value={user.phone ?? ""}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
                    <Package className="h-4 w-4" />
                    {t("profile.ordersLink")}
                  </Link>
                  <Link href="/favorites" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
                    <Heart className="h-4 w-4" />
                    {t("profile.favoritesLink")}
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={busy === "profile"}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {busy === "profile" && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  {t("profile.save")}
                </button>
              </div>
            </form>
          )}

          {active === "addresses" && (
            <div className="space-y-6">
              <form
                onSubmit={saveAddress}
                className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? t("addresses.editTitle") : t("addresses.addTitle")}
                </h2>
                <p className="text-sm text-gray-600 mb-4">{t("addresses.defaultDeliveryAddress")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.firstNameLabel")}</label>
                    <input
                      value={form.first_name ?? ""}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.lastNameLabel")}</label>
                    <input
                      value={form.last_name ?? ""}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addresses.addressLine1Label")}
                    </label>
                    <input
                      value={form.address_line1}
                      onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.addressLine2Label")}</label>
                    <input
                      value={form.address_line2 ?? ""}
                      onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.cityLabel")}</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.regionLabel")}</label>
                    <input
                      value={form.state_province ?? ""}
                      onChange={(e) => setForm({ ...form, state_province: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.phoneLabel")}</label>
                    <input
                      value={form.phone ?? ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("addresses.countryLabel")}</label>
                    <select
                      value={form.country_code}
                      onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="CM">{t("addresses.countries.cm")}</option>
                      <option value="CI">{t("addresses.countries.ci")}</option>
                      <option value="SN">{t("addresses.countries.sn")}</option>
                      <option value="BF">{t("addresses.countries.bf")}</option>
                      <option value="TG">{t("addresses.countries.tg")}</option>
                      <option value="BJ">{t("addresses.countries.bj")}</option>
                      <option value="GA">{t("addresses.countries.ga")}</option>
                      <option value="CG">{t("addresses.countries.cg")}</option>
                      <option value="CD">{t("addresses.countries.cd")}</option>
                      <option value="MA">{t("addresses.countries.ma")}</option>
                      <option value="FR">{t("addresses.countries.fr")}</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 sm:col-span-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_default ?? false}
                      onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    {t("addresses.defaultAddressLabel")}
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy === "create" || busy === `edit-${editingId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {busy === "create" || busy === `edit-${editingId}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {editingId ? t("addresses.update") : t("addresses.add")}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm({ ...emptyAddress });
                      }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                      {t("addresses.cancel")}
                    </button>
                  )}
                </div>
              </form>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-gray-900">{t("addresses.myAddresses")}</h2>
                {addressesLoading ? (
                  <div className="flex justify-center py-8 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : addresses.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">{t("addresses.noneSaved")}</p>
                ) : (
                  <ul className="mt-4 divide-y divide-gray-100">
                    {addresses.map((address) => (
                      <li key={address.id} className="flex items-start justify-between gap-3 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {address.first_name ? `${address.first_name} ${address.last_name ?? ""}`.trim() : "—"}{" "}
                            {address.is_default && (
                              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                {t("addresses.defaultBadge")}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {address.address_line1}
                            {address.address_line2 ? `, ${address.address_line2}` : ""},{" "}
                            {address.city}
                            {address.state_province ? `, ${address.state_province}` : ""} ·{" "}
                            {address.country_code}
                          </p>
                          {address.phone && <p className="text-xs text-gray-500">{address.phone}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(address)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t("addresses.edit")}
                          </button>
                          <button
                            type="button"
                            disabled={busy === `delete-${address.id}`}
                            onClick={() => void removeAddress(address)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("addresses.delete")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">{t("navigation.notificationsTitle")}</h2>
                <p className="text-sm text-gray-600">{t("notifications.subtitle")}</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                  <span className="text-sm font-medium text-gray-900">{t("notifications.inapp")}</span>
                  <input
                    type="checkbox"
                    checked={notifications.inapp}
                    disabled={busy === "notif-inapp"}
                    onChange={(e) => void toggleNotification("inapp", e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4 opacity-60">
                  <span className="text-sm font-medium text-gray-900">
                    {t("notifications.sms")}
                    <span className="block text-xs font-normal text-gray-500">{t("notifications.soon")}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    disabled
                    className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                  <span className="text-sm font-medium text-gray-900">{t("notifications.voice")}</span>
                  <input
                    type="checkbox"
                    checked={notifications.voice}
                    disabled={busy === "notif-voice"}
                    onChange={(e) => void toggleNotification("voice", e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <Link
                  href="/notifications"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {t("notifications.viewRecent")} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {active === "security" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">{t("navigation.securityTitle")}</h2>
                <p className="text-sm text-gray-600">{t("security.subtitle")}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t("security.pin")}</p>
                    <p className="text-xs text-gray-500">
                      {user.security.pin_configured ? t("security.configured") : t("security.notConfigured")}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {user.security.pin_configured ? t("security.enabled") : t("security.disabled")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t("security.biometrics")}</p>
                    <p className="text-xs text-gray-500">
                      {user.security.biometric_enabled ? t("security.configured") : t("security.notConfigured")}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {user.security.biometric_enabled ? t("security.enabled") : t("security.disabled")}
                  </span>
                </div>
                <Link
                  href="/settings/security"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {t("security.manage")} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}