const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BCRYPT_RE = /^\$2[aby]\$/;

function getRounds() {
  const v = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  return Number.isFinite(v) && v >= 8 && v <= 14 ? v : 10;
}

function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password is required');
  }
  const salt = bcrypt.genSaltSync(getRounds());
  const hash = bcrypt.hashSync(password, salt);
  return { salt: null, hash }; // bcrypt stores salt internally
}

function verifyPassword(password, saltOrHash, expectedHash) {
  if (typeof password !== 'string' || password.length === 0) return false;

  // 3-arg path where expectedHash is bcrypt: ignore salt
  if (typeof expectedHash === 'string' && BCRYPT_RE.test(expectedHash)) {
    return bcrypt.compareSync(password, expectedHash);
  }

  // 2-arg path: (password, bcryptHash)
  if (expectedHash == null && typeof saltOrHash === 'string' && BCRYPT_RE.test(saltOrHash)) {
    return bcrypt.compareSync(password, saltOrHash);
  }

  // Legacy sha256(salt:password)
  if (typeof saltOrHash === 'string' && typeof expectedHash === 'string') {
    const legacy = crypto.createHash('sha256').update(`${saltOrHash}:${password}`).digest('hex');
    return legacy === expectedHash;
  }

  return false;
}

module.exports = { hashPassword, verifyPassword };