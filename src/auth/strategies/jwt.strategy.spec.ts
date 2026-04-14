import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtPayload } from '../decorators/current-user.decorator.js';

// ─── Mocks ────────────────────────────────────────────────────────

const mockValidPayload: JwtPayload = {
  sub: 'uuid-123',
  email: 'test@bookflix.com',
  username: 'testuser',
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test_jwt_secret'),
  getOrThrow: jest.fn().mockReturnValue('test_jwt_secret'),
};

// ─── Tests ────────────────────────────────────────────────────────

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  // ─── validate ───────────────────────────────────────────────────

  describe('validate', () => {
    it('devrait retourner le payload si le token est valide', () => {
      const result = jwtStrategy.validate(mockValidPayload);

      expect(result).toEqual(mockValidPayload);
    });

    it('devrait lever une UnauthorizedException si sub est manquant', () => {
      const invalidPayload = {
        ...mockValidPayload,
        sub: '',
      };

      expect(() => jwtStrategy.validate(invalidPayload)).toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever une UnauthorizedException si email est manquant', () => {
      const invalidPayload = {
        ...mockValidPayload,
        email: '',
      };

      expect(() => jwtStrategy.validate(invalidPayload)).toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever une UnauthorizedException si sub et email sont manquants', () => {
      const invalidPayload = {
        ...mockValidPayload,
        sub: '',
        email: '',
      };

      expect(() => jwtStrategy.validate(invalidPayload)).toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('devrait lever une erreur si JWT_SECRET est manquant', () => {
      const configServiceSansSecret = {
        get: jest.fn().mockReturnValue(undefined),
        getOrThrow: jest.fn().mockImplementation(() => {
          throw new Error('JWT_SECRET non défini dans les variables d\'environnement');
        }),
      };

      expect(() => {
        new JwtStrategy(configServiceSansSecret as any);
      }).toThrow('JWT_SECRET non défini dans les variables d\'environnement');
    });
  });
});