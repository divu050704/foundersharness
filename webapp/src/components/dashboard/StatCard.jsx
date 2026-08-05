import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}) {
  return (
    <Card className="overflow-hidden border border-border bg-card shadow-none rounded">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {title}
        </CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {trend ? (
            <span
              className={
                trend.startsWith("+")
                  ? "text-primary font-semibold"
                  : "text-destructive font-semibold"
              }
            >
              {trend}
            </span>
          ) : null}{" "}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
