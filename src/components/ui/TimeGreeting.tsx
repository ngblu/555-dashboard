"use client";

import { useState, useEffect } from "react";

export default function TimeGreeting() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <span className="text-text-primary font-medium">
      {greeting}, <span className="text-primary">Noah</span>
    </span>
  );
}
