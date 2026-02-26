"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      redirect("/home");
    } else if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status, session]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
}
