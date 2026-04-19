import { Test, TestingModule } from "@nestjs/testing";
import { RendMService } from "./rend-m.service";
import { AdjuntosService } from "../adjuntos/adjuntos.service";

describe("RendMService", () => {
  let service: RendMService;

  const mockRepo = {
    findByUser: jest.fn(),
    findBySubordinados: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockAdjuntosService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RendMService,
        { provide: "REND_M_REPOSITORY", useValue: mockRepo },
        { provide: AdjuntosService, useValue: mockAdjuntosService },
      ],
    }).compile();

    service = module.get<RendMService>(RendMService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
