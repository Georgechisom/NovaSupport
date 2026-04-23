"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { WalletConnect } from "@/components/wallet-connect";
import { getNetworkLabel } from "@/lib/stellar";
import { API_BASE_URL } from "@/lib/config";

type SearchResult = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/profiles/search?q=${encodeURIComponent(searchQuery)}`,
        );

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  function handleResultClick() {
    setShowDropdown(false);
    setSearchQuery("");
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-grid bg-[size:26px_26px] bg-center px-6 py-6 shadow-2xl shadow-black/25">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-2xl font-semibold tracking-tight text-white"
              >
                NovaSupport
              </Link>
              <p className="mt-2 max-w-2xl text-sm text-sky/80">
                Stellar-native creator support on {getNetworkLabel()} with
                Freighter, Horizon, and a Soroban-ready contract path.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-sky/80">
              <Link href="/" className="hover:text-white transition">
                Home
              </Link>
              <Link href="/explore" className="hover:text-white transition">
                Explore
              </Link>
              <Link
                href="/profile/stellar-dev"
                className="hover:text-white transition"
              >
                Sample profile
              </Link>
              <Link href="/create" className="hover:text-white transition">
                Create draft
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-sky/50 focus:border-mint/50 focus:outline-none"
            />

            {/* Search Dropdown */}
            {showDropdown && (
              <div className="absolute top-full mt-2 w-full rounded-xl border border-white/10 bg-ink/95 backdrop-blur-sm shadow-xl z-50 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="px-4 py-3 text-sm text-sky/70">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((result) => (
                      <Link
                        key={result.username}
                        href={`/profile/${result.username}`}
                        onClick={handleResultClick}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition border-b border-white/5 last:border-0"
                      >
                        {result.avatarUrl ? (
                          <img
                            src={result.avatarUrl}
                            alt={result.displayName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-mint to-gold flex items-center justify-center text-sm font-bold text-ink">
                            {result.displayName[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {result.displayName}
                          </p>
                          <p className="text-xs text-sky/70 truncate">
                            @{result.username}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-sky/70">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <section className="mb-8">
          <WalletConnect />
        </section>
        {children}
      </div>
    </main>
  );
}
