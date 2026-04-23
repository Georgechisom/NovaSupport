"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  acceptedAssets: { code: string; issuer?: string | null }[];
};

type SortOption = "newest" | "most_supported" | "most_transactions";
type AssetFilter = "all" | "XLM" | "USDC";

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [asset, setAsset] = useState<AssetFilter>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    setOffset(0);
    setProfiles([]);
    setHasMore(true);
    fetchProfiles(0, true);
  }, [sort, asset]);

  async function fetchProfiles(currentOffset: number, reset = false) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
        sort,
      });

      if (asset !== "all") {
        params.append("asset", asset);
      }

      const response = await fetch(`${API_BASE_URL}/profiles?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }

      const data = await response.json();

      if (reset) {
        setProfiles(data.profiles);
      } else {
        setProfiles((prev) => [...prev, ...data.profiles]);
      }

      setHasMore(data.profiles.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadMore() {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchProfiles(newOffset);
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-white mb-2">Explore Creators</h1>
        <p className="text-sky/80 mb-8">
          Discover and support amazing creators on Stellar
        </p>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-sky/70 block mb-2">
              Sort by
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-mint/50 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="most_supported">Most Supported</option>
              <option value="most_transactions">Most Transactions</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-sky/70 block mb-2">
              Asset
            </label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value as AssetFilter)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-mint/50 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && profiles.length === 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6 animate-pulse"
              >
                <div className="h-20 w-20 rounded-full bg-white/10 mb-4" />
                <div className="h-6 bg-white/10 rounded mb-2 w-3/4" />
                <div className="h-4 bg-white/10 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-200">
            {error}
          </div>
        )}

        {/* Profiles grid */}
        {!loading || profiles.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.username}`}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-mint/30 hover:bg-white/10"
                >
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="h-20 w-20 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-mint to-gold mb-4 flex items-center justify-center text-2xl font-bold text-ink">
                      {profile.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {profile.displayName}
                  </h3>
                  <p className="text-sm text-sky/70 mb-3">
                    @{profile.username}
                  </p>
                  <p className="text-sm text-sky/85 line-clamp-2">
                    {profile.bio}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.acceptedAssets.slice(0, 3).map((asset, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-mint/20 text-mint"
                      >
                        {asset.code}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More button */}
            {hasMore && profiles.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-full bg-mint px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}

            {!hasMore && profiles.length > 0 && (
              <p className="mt-8 text-center text-sm text-sky/70">
                You've reached the end
              </p>
            )}

            {profiles.length === 0 && !loading && !error && (
              <div className="text-center py-12">
                <p className="text-sky/70">No profiles found</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
