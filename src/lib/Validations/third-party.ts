import { z } from "zod";

export const thirdPartySchema = z.object({
  type: z.enum(["CLIENTE", "PROVEEDOR", "AMBOS"]),
  docType: z.string().min(1),
  docNumber: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type ThirdPartyInput = z.infer<typeof thirdPartySchema>;