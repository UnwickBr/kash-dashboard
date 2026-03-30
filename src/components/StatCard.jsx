import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon, trend, trendUp, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-card rounded-2xl border border-border p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trendUp ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            {trendUp ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">{title}</p>
    </motion.div>
  );
}