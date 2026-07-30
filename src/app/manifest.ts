import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal CFO OS",
    short_name: "Personal CFO",
    description: "Manage bank accounts, transactions, allocations, and financial goals in one premium OS.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "https://img.icons8.com/ios/192/512/wallet.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "https://img.icons8.com/ios/512/512/wallet.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
