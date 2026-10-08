import { getMoney, type MobileNetwork, type WalletInfo } from "@/api/money"
import { useServerData } from "@/features/farmer/useServerData"
import { maskPhone } from "@/lib/phone"

/** The three Ghana mobile money networks, as farmers know them. */
export const NETWORKS: readonly { code: MobileNetwork; label: string }[] = [
  { code: "mtn", label: "MTN MoMo" },
  { code: "telecel", label: "Telecel Cash" },
  { code: "airteltigo", label: "AirtelTigo Money" },
]

export function networkLabel(code: MobileNetwork): string {
  return NETWORKS.find((n) => n.code === code)?.label ?? code
}

/** "MTN MoMo · +233 24 ••• 0001" */
export function walletText(wallet: WalletInfo): string {
  return `${networkLabel(wallet.network)} · ${maskPhone(wallet.phoneE164)}`
}

/** The wallet and payments, kept on the device for offline viewing like the other farmer answers. */
export function useMoney() {
  return useServerData("money", getMoney)
}
