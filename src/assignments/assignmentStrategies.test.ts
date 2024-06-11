import { Test } from "@nestjs/testing";
import { createId } from "@paralleldrive/cuid2";
import { HouseRepository } from "../houses/house.repository";
import { INestApplication } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RoundRobinStrategy } from "./strategies/roundRobin";
import { AssignmentModule } from "./assignment.module";
import { ChoreService } from "../../src/chores/chore.service";
import { House } from "../../src/houses/house.model";
import { Frequency } from "@prisma/client";
import { AssignmentRepository } from "./assignment.repository";
import { Chore } from "../../src/chores/chore.model";
import { isEmpty, partition } from "../../src/utils";
import { ChoreRepository } from "../chores/chore.repository";
import { CommonModule } from "../common.module";
import { AssignmentService } from "./assignment.service";

describe("Assignment Strategies", () => {
  let app: INestApplication;
  let houseRepository: HouseRepository;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CommonModule, AssignmentModule],
      providers: [ChoreRepository],
    }).compile();
    app = module.createNestApplication();
    houseRepository = app.get(HouseRepository);
  });

  afterAll(async () => {
    await app.get(PrismaService).house.deleteMany();
    await app.get(PrismaService).assignment.deleteMany();
    await app.get(PrismaService).chore.deleteMany();
  });

  describe("the default (round robin)", () => {
    describe("2 members", () => {
      let house: House;

      beforeAll(async () => {
        const prisma = app.get(PrismaService);
        const creatorId = createId();
        house = await prisma.house.create({
          data: {
            name: "The House",
            creatorId,
            adminId: creatorId,
            memberIds: [creatorId, createId()],
          },
        });
      });

      describe("with 1 chore", () => {
        let chore: Chore;

        beforeAll(async () => {
          chore = await app.get(ChoreRepository).create({
            creatorId: house.memberIds[0],
            name: "Clean the kitchen",
            description: "",
            frequency: Frequency.WEEKLY,
            house: {
              connect: { id: house.id },
            },
          });
        });

        it("assigns to alternates the chore between members", async () => {
          const [alice, bob] = ["alice", "bob"];
          const strategy = new RoundRobinStrategy(app.get(AssignmentService), {
            members: [alice, bob],
            houseId: house.id,
            chores: [chore],
          });

          const week0Result = await strategy.apply(0);
          expect(week0Result[alice]).toContainEqual(
            expect.objectContaining({
              choreId: chore.id,
              isPenalty: false,
              week: 0,
            }),
          );
          expect(week0Result[bob]).toHaveLength(0);

          await app
            .get(AssignmentRepository)
            .createMany(Object.values(week0Result).flat());

          const week1Result = await strategy.apply(1);
          expect(week1Result[alice]).toHaveLength(0);
          expect(week1Result[bob]).toContainEqual(
            expect.objectContaining({
              choreId: chore.id,
              isPenalty: false,
              week: 1,
            }),
          );

          await app
            .get(AssignmentRepository)
            .createMany(Object.values(week1Result).flat());

          const week2Result = await strategy.apply(2);
          expect(week2Result[alice]).toContainEqual(
            expect.objectContaining({
              choreId: chore.id,
              isPenalty: false,
              week: 2,
            }),
          );
          expect(week2Result[bob]).toHaveLength(0);
        });
      });
    });
  });
});
