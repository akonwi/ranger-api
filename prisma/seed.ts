import { PrismaClient, Frequency } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.house.create({
    data: {
      id: "clom6lcon0000i00flfbir3lc",
      name: "The Ngoh House",
      creatorId: "google-oauth2|110029945167450156347",
      adminId: "google-oauth2|110029945167450156347",
      memberIds: [
        "google-oauth2|110029945167450156347",
        "google-oauth2|108193015358805265423",
      ],
      chores: {
        createMany: {
          data: [
            {
              name: "Vacuum + Mop",
              frequency: Frequency.WEEKLY,
              creatorId: "google-oauth2|110029945167450156347",
              description: "",
              customFrequency: null,
            },
            {
              name: "Take out trash",
              frequency: Frequency.WEEKLY,
              creatorId: "google-oauth2|110029945167450156347",
              day: null,
              description: "",
              customFrequency: null,
            },
            {
              name: "Dusting",
              frequency: Frequency.WEEKLY,
              creatorId: "google-oauth2|110029945167450156347",
              day: null,
              description: "",
              customFrequency: null,
            },
            {
              name: "Clean kitchen",
              frequency: Frequency.WEEKLY,
              creatorId: "google-oauth2|110029945167450156347",
              day: null,
              description: "And microwave",
              customFrequency: null,
            },
            {
              name: "Clean bathrooms",
              frequency: Frequency.WEEKLY,
              creatorId: "google-oauth2|110029945167450156347",
              day: null,
              description: "And the main shower",
              customFrequency: null,
            },
          ],
        },
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
