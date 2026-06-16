import { prisma } from "./src/lib/db/client.ts"

async function checkData() {
  const users = await prisma.user.findMany({ include: { profile: true, workspaces: true } })
  console.log("Users:", JSON.stringify(users, null, 2))
  
  if (users.length > 0) {
    const workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId: users[0].id } } },
      include: {
        accounts: true,
        assets: true,
        liabilities: true,
        goals: true
      }
    })
    console.log("Workspace Data for user 0:", JSON.stringify(workspace, null, 2))
  }
}
checkData()
