"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Users as UsersIcon, Loader2 } from "lucide-react";
import {
  getAdminUsers,
  updateAdminUser,
  updateAdminUserRole,
  type AdminUser,
} from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";

const roleLabelKeys: Record<string, string> = {
  admin: "users.roleLabels.admin",
  moderator: "users.roleLabels.moderator",
  seller: "users.roleLabels.seller",
  delivery: "users.roleLabels.delivery",
  buyer: "users.roleLabels.buyer",
};

const roleFilter = [
  { value: "", labelKey: "users.filters.allRoles" },
  { value: "admin", labelKey: "users.filters.admins" },
  { value: "moderator", labelKey: "users.filters.moderators" },
  { value: "seller", labelKey: "users.filters.sellers" },
  { value: "delivery", labelKey: "users.filters.delivery" },
  { value: "buyer", labelKey: "users.filters.buyers" },
] as const;

const statusLabelKeys: Record<string, string> = {
  active: "users.statusLabels.active",
  suspended: "users.statusLabels.suspended",
  banned: "users.statusLabels.banned",
};

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [inputSearch, setInputSearch] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminUsers({ search: search || undefined, role: role || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("users.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, search, page, reload]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputSearch);
    setPage(1);
    setReload((n) => n + 1);
  };

  const changeStatus = async (user: AdminUser, status: string) => {
    setBusy(`status-${user.id}`);
    setError(null);
    setNotice(null);
    try {
      const message = await updateAdminUser(user.id, status);
      setNotice(message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("users.updateError"));
    } finally {
      setBusy(null);
    }
  };

  const changeRole = async (user: AdminUser, selectedRole: string, action: "assign" | "remove") => {
    if (!selectedRole) return;
    setBusy(`role-${user.id}`);
    setError(null);
    setNotice(null);
    try {
      const message = await updateAdminUserRole(user.id, selectedRole, action);
      setNotice(message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("users.updateRoleError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("users.title")}</h1>
        <p className="text-sm text-gray-600">{t("users.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder={t("users.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("users.search")}
          </button>
        </form>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          {roleFilter.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <UsersIcon className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("users.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("users.user")}</th>
                <th className="px-4 py-3 font-medium">{t("users.roles")}</th>
                <th className="px-4 py-3 font-medium">{t("users.profile")}</th>
                <th className="px-4 py-3 font-medium">{t("users.status")}</th>
                <th className="px-4 py-3 font-medium">{t("users.changeStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("users.quickRole")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email ?? "—"}{user.phone ? ` · ${user.phone}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold capitalize text-emerald-700">
                          {roleLabelKeys[r] ? t(roleLabelKeys[r]) : r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {user.seller ? t("users.shopProfile", { name: user.seller.shop_name }) : ""}
                    {user.courier ? t("users.deliveryProfile") : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : user.status === "suspended"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}>
                      {t(statusLabelKeys[user.status] ?? "users.statusLabels.active")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.status}
                      disabled={busy === `status-${user.id}`}
                      onChange={(e) => void changeStatus(user, e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                    >
                      <option value="active">{t("users.statusLabels.active")}</option>
                      <option value="suspended">{t("users.statusLabels.suspended")}</option>
                      <option value="banned">{t("users.statusLabels.banned")}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <select
                        disabled={busy === `role-${user.id}`}
                        onChange={(e) => void changeRole(user, e.target.value, "assign")}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                      >
                        <option value="">{t("users.addRole")}</option>
                        {Object.keys(roleLabelKeys).map((r) => (
                          <option key={r} value={r}>{t(roleLabelKeys[r])}</option>
                        ))}
                      </select>
                      {user.roles.length > 0 && (
                        <select
                          disabled={busy === `role-${user.id}`}
                          onChange={(e) => void changeRole(user, e.target.value, "remove")}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none disabled:opacity-40"
                        >
                          <option value="">{t("users.removeRole")}</option>
                          {user.roles.map((r) => (
                            <option key={r} value={r}>{roleLabelKeys[r] ? t(roleLabelKeys[r]) : r}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-3">
            <AdminPagination meta={meta} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}