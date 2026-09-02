import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCustomerPhone, splitCustomerName } from "../src/lib/customer-identity";

test("normaliza teléfonos chilenos locales e internacionales a la misma identidad", () => {
  assert.equal(normalizeCustomerPhone("+56 9 1234 5678"), "56912345678");
  assert.equal(normalizeCustomerPhone("9 1234 5678"), "56912345678");
  assert.equal(normalizeCustomerPhone("0056 9 1234 5678"), "56912345678");
});

test("separa el nombre para crear un cliente presencial", () => {
  assert.deepEqual(splitCustomerName("Ana María Pérez Soto"), { firstName: "Ana", lastName: "María Pérez Soto" });
  assert.deepEqual(splitCustomerName(""), { firstName: "Cliente", lastName: "Presencial" });
});
