import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const orders = [
  {
    id: "ORD001",
    customer: "Olivia Martin",
    email: "olivia.martin@email.com",
    amount: "$1,999.00",
    status: "Paid",
    date: "2026-08-01",
  },
  {
    id: "ORD002",
    customer: "Jackson Lee",
    email: "jackson.lee@email.com",
    amount: "$39.00",
    status: "Pending",
    date: "2026-08-02",
  },
  {
    id: "ORD003",
    customer: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    amount: "$299.00",
    status: "Paid",
    date: "2026-08-03",
  },
  {
    id: "ORD004",
    customer: "William Kim",
    email: "will@email.com",
    amount: "$99.00",
    status: "Refunded",
    date: "2026-08-03",
  },
  {
    id: "ORD005",
    customer: "Sofia Davis",
    email: "sofia.davis@email.com",
    amount: "$149.00",
    status: "Paid",
    date: "2026-08-04",
  },
];

export default function RecentOrders() {
  return (
    <Card className="col-span-3 border border-border bg-card rounded shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground uppercase">
          Recent Transactions
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Latest dashboard purchases and statuses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="text-xs font-semibold">Customer</TableHead>
              <TableHead className="hidden sm:table-cell text-xs font-semibold">
                Status
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs font-semibold">
                Date
              </TableHead>
              <TableHead className="text-right text-xs font-semibold">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className="border-b border-border/60 hover:bg-secondary/40 transition-none"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8 rounded">
                      <AvatarImage src="" className="rounded" />
                      <AvatarFallback className="bg-secondary text-foreground text-xs font-medium rounded">
                        {order.customer
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold leading-none text-foreground">
                        {order.customer}
                      </p>
                      <p className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
                        {order.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant={
                      order.status === "Paid"
                        ? "default"
                        : order.status === "Pending"
                          ? "secondary"
                          : "destructive"
                    }
                    className="rounded text-[10px] uppercase font-semibold px-2 py-0.5 transition-none shadow-none"
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {order.date}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                  {order.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
