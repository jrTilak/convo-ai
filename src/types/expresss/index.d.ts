import { User as U } from "@/lib/prisma";

declare global {
  namespace Express {
    interface User extends U {}
    interface Request {
      user?: User;
    }
  }
}
