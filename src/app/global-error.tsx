"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ textAlign: "center", padding: "24px" }}>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "16px",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: "#6b7280",
                marginBottom: "32px",
                maxWidth: "400px",
              }}
            >
              We hit an unexpected error. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#111827",
                color: "white",
                padding: "12px 24px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
