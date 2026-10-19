import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePrit } from '../src/utils/prit.utils';

test('normaliza números e aceita chaves de issue com diferentes projetos', () => {
  assert.equal(normalizePrit(' 1234 '), 'PRIT-1234');
  assert.equal(normalizePrit('prit-1234'), 'PRIT-1234');
  assert.equal(normalizePrit('ierl-23569'), 'IERL-23569');
});

test('rejeita chaves que não seguem o formato de issue', () => {
  assert.throws(() => normalizePrit('PRIT-1/other'), /PRIT inválido/);
});
