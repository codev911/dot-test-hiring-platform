import { HashingService } from '../../src/services/hashing.service';

describe('HashingService', () => {
  it('returns the hashed text', () => {
    const data = 'Hello World!';

    expect(HashingService.hash(data)).toBe(
      '0xf63b35b2510c1ecfd7f4415c7727e8d14acc3252dd7f8703af4b04fe6455d846',
    );
  });
});
