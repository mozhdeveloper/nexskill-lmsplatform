"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-accent px-8 py-14 text-center shadow-soft-lg sm:px-16"
      >
        <div className="absolute inset-0 bg-dot-grid opacity-10" />
        <h2 className="relative text-3xl font-semibold text-white sm:text-4xl">Ready to build your future?</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/85">
          Join as a learner, or apply to teach the skill you know best.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button
              size="lg"
              className="w-full !bg-white !text-primary shadow-none hover:!bg-white/90 hover:!text-primary sm:w-auto"
            >
              Get started free
            </Button>
          </Link>
          <Link href="/become-a-coach">
            <Button
              size="lg"
              variant="secondary"
              className="w-full !border-white/40 !bg-transparent !text-white hover:!bg-white/10 sm:w-auto"
            >
              Become a coach
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
