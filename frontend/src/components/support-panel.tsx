"use client";

import { useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import {
  buildSupportIntent,
  getNetworkLabel,
  horizonServer,
  stellarConfig,
} from "@/lib/stellar";
import { WalletConnect } from "./wallet-connect";
import { API_BASE_URL } from "@/lib/config";

type Asset = {
  code: string;
  issuer?: string | null;
};

type SupportPanelProps = {
  walletAddress: string;
  acceptedAssets?: Asset[];
  profileId?: string;
};

export function SupportPanel({
  walletAddress,
  acceptedAssets,
  profileId,
}: SupportPanelProps) {
  const [visitorAddress, setVisitorAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const networkLabel = getNetworkLabel();

  const selectedAsset = acceptedAssets?.[0];
  const amountNum = parseFloat(amount);
  const isValidAmount = amountNum > 0;
  const showError = amount !== "" && !isValidAmount;
  const isProcessing = isSigning || isSubmitting;

  function truncateHash(hash: string) {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  }

  function mapHorizonError(error: unknown): string {
    const resultCodes =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "data" in error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "extras" in error.response.data &&
      error.response.data.extras &&
      typeof error.response.data.extras === "object" &&
      "result_codes" in error.response.data.extras
        ? (error.response.data.extras.result_codes as {
            transaction?: string;
            operations?: string[];
          })
        : null;

    const operationCode = resultCodes?.operations?.[0];
    const transactionCode = resultCodes?.transaction;

    if (operationCode === "op_underfunded") {
      return "Insufficient balance";
    }

    if (transactionCode === "tx_too_late") {
      return "Transaction expired";
    }

    if (transactionCode === "tx_bad_seq") {
      return "Transaction sequence is out of date. Please try again.";
    }

    if (transactionCode === "tx_insufficient_balance") {
      return "Insufficient balance";
    }

    if (transactionCode === "tx_bad_auth" || operationCode === "op_bad_auth") {
      return "Authorization failed. Please reconnect Freighter and try again.";
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Unable to submit transaction to Stellar. Please try again.";
  }

  async function handleSendSupport() {
    if (!visitorAddress || !isValidAmount || isProcessing) {
      return;
    }

    setErrorMessage(null);
    setSubmittedHash(null);
    setRecurringError(null);
    setIsSigning(true);

    try {
      const unsignedXdr = await buildSupportIntent({
        sourceAccount: visitorAddress,
        destination: walletAddress,
        amount,
        assetCode: selectedAsset?.issuer ? selectedAsset.code : undefined,
        assetIssuer: selectedAsset?.issuer ?? undefined,
      });

      const signedResult = await signTransaction(unsignedXdr, {
        address: visitorAddress,
        networkPassphrase: stellarConfig.networkPassphrase,
      });

      if (signedResult.error || !signedResult.signedTxXdr) {
        throw new Error(
          signedResult.error ||
            "Freighter did not return a signed transaction.",
        );
      }

      setIsSigning(false);
      setIsSubmitting(true);

      const transactionToSubmit = TransactionBuilder.fromXDR(
        signedResult.signedTxXdr,
        stellarConfig.networkPassphrase,
      );

      const response =
        await horizonServer.submitTransaction(transactionToSubmit);

      setSubmittedHash(response.hash);

      // If recurring is enabled, set up the drip
      if (isRecurring && profileId) {
        try {
          const token = localStorage.getItem("authToken");
          const recurringResponse = await fetch(
            `${API_BASE_URL}/recurring-support`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                supporterAddress: visitorAddress,
                recipientAddress: walletAddress,
                profileId,
                amount,
                assetCode: selectedAsset?.code || "XLM",
                assetIssuer: selectedAsset?.issuer,
                frequency,
              }),
            },
          );

          if (!recurringResponse.ok) {
            throw new Error("Failed to set up recurring support");
          }
        } catch (recurringErr) {
          setRecurringError(
            "On-chain payment succeeded, but drip setup failed. Please try setting up recurring support again.",
          );
        }
      }

      setAmount("");
    } catch (error) {
      setErrorMessage(mapHorizonError(error));
    } finally {
      setIsSigning(false);
      setIsSubmitting(false);
    }
  }

  if (!visitorAddress) {
    return (
      <section className="rounded-[2rem] border border-gold/25 bg-gold/10 p-7 text-center">
        <div className="mb-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            {networkLabel}
          </span>
        </div>
        <p className="mb-4 text-sm text-sky/85">
          Connect your Freighter wallet to support this creator.
        </p>
        <WalletConnect onConnect={setVisitorAddress} />
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-gold/25 bg-gold/10 p-7">
      <div className="mb-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          {networkLabel}
        </span>
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-gold">
        Support intent
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">
        Ready for a real Stellar flow
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-sky/85">
        Build, sign, and submit a {networkLabel} payment to the recipient
        address below. Successful transactions are broadcast directly to Stellar
        Testnet and return a live transaction hash from Horizon.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-ink/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky/70">
            Network
          </p>
          <p className="mt-2 font-semibold text-white">{getNetworkLabel()}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-ink/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky/70">
            Horizon
          </p>
          <p className="mt-2 break-all text-sm text-white">
            {stellarConfig.horizonUrl}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-ink/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky/70">
            Recipient
          </p>
          <p className="mt-2 break-all text-sm text-white">{walletAddress}</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mt-6">
        <label className="text-xs uppercase tracking-[0.2em] text-sky/70 block mb-2">
          Amount
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.0000001"
            step="0.0000001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-sky/50 focus:border-mint/50 focus:outline-none"
          />
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky/80 min-w-[80px] justify-center">
            <span className="font-semibold text-white">
              {selectedAsset?.code || "XLM"}
            </span>
          </div>
        </div>
        {showError && (
          <p className="mt-2 text-xs text-red-400">
            Please enter a positive amount
          </p>
        )}
      </div>

      {/* Recurring Support Toggle */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/10 text-mint focus:ring-mint focus:ring-offset-0"
          />
          <span className="text-sm text-white font-medium">
            Make it recurring
          </span>
        </label>

        {isRecurring && (
          <div className="mt-4">
            <label className="text-xs uppercase tracking-[0.2em] text-sky/70 block mb-2">
              Frequency
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFrequency("weekly")}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  frequency === "weekly"
                    ? "bg-mint text-ink"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  frequency === "monthly"
                    ? "bg-mint text-ink"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {recurringError ? (
        <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {recurringError}
        </div>
      ) : null}

      {submittedHash ? (
        <div className="mt-4 rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3 text-sm text-mint">
          {isRecurring && !recurringError ? (
            <>
              Drip activated! You'll support this creator every{" "}
              {frequency === "weekly" ? "week" : "month"}.
              <br />
              Transaction:{" "}
              <span className="font-semibold text-white">
                {truncateHash(submittedHash)}
              </span>
            </>
          ) : (
            <>
              Transaction submitted:{" "}
              <span className="font-semibold text-white">
                {truncateHash(submittedHash)}
              </span>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSendSupport}
        disabled={!isValidAmount || isProcessing}
        className="mt-6 w-full rounded-full bg-mint px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-mint"
      >
        {isSubmitting
          ? "Submitting to Stellar network…"
          : isSigning
            ? "Waiting for Freighter signature…"
            : "Send Support"}
      </button>
    </section>
  );
}
