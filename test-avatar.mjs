import { prisma } from "./src/lib/db/client.ts"

async function checkAvatar() {
  const users = await prisma.user.findMany()
  if (users.length > 0) {
    const avatar = users[0].avatarUrl || ""
    console.log("Avatar URL length:", avatar.length)
    console.log("Starts with:", avatar.substring(0, 50))
  } else {
    console.log("No users found.")
  }
}
checkAvatar()
