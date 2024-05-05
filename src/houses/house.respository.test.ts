import { Test } from "@nestjs/testing";
import { HouseModule } from "./house.module";
import { HouseRepository } from "./house.repository";

describe("HouseRepository", () => {
  let repository: HouseRepository;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [HouseModule],
    }).compile();
    const app = module.createNestApplication();
    repository = app.get(HouseRepository);
  });

  describe("destroy()", () => {
    it("deletes the house with the given id", async () => {
      const house = await repository.create({ name: "House", creatorId: "1" });
      await repository.destroy(house.id);
      const result = await repository.get(house.id);
      expect(result).toBeNull();
    });
  });
});
