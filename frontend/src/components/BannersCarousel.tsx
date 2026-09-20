"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getBanners, type Banner } from "@/lib/api";

export default function BannersCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    getBanners()
      .then(setBanners)
      .catch(() => undefined);
  }, []);

  const count = banners.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const banner = banners[Math.min(index, count - 1)];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative h-72 sm:h-80 overflow-hidden rounded-3xl bg-gray-900 text-white">
        {banner.link ? (
          <Link href={banner.link} className="absolute inset-0">
            <BannerImage src={banner.image} />
          </Link>
        ) : (
          <BannerImage src={banner.image} />
        )}
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-center px-8 sm:px-12">
          <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/90 backdrop-blur">
            Yaxantu
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-balance">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="mt-2 text-sm sm:text-base text-white/80">{banner.subtitle}</p>
          )}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              aria-label="Bannière précédente"
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2 backdrop-blur hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % count)}
              aria-label="Bannière suivante"
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2 backdrop-blur hover:bg-white/30 transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Bannière ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function BannerImage({ src }: { src: string }) {
  return (
    <div className="absolute inset-0">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
    </div>
  );
}