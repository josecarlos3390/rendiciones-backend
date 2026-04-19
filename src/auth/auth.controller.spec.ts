import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("should call authService.login", async () => {
      const dto = { username: "admin", password: "pass" };
      const expected = { token: "jwt" };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe("refreshToken", () => {
    it("should call authService.refreshToken with user sub", async () => {
      const req = { user: { sub: 1 } } as any;
      const expected = { token: "new-jwt" };
      mockAuthService.refreshToken.mockResolvedValue(expected);

      const result = await controller.refreshToken(req);

      expect(result).toEqual(expected);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(1);
    });
  });

  describe("getProfile", () => {
    it("should return user from request", () => {
      const req = { user: { sub: 1, username: "admin" } } as any;

      const result = controller.getProfile(req);

      expect(result).toEqual(req.user);
    });
  });
});
