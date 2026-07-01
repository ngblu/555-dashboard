"use client";

import { useState, useEffect } from "react";
import { useData } from "@/lib/store";

export default function TimeGreeting() {
  const [greeting, setGreeting] = useState("");
  const { user } = useData();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Noah";

  return (
    <span className="text-text-primary font-medium">
      {greeting}, <span className="text-primary">{firstName}</span>
    </span>
  );
}
