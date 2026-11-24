import { describe, it, expect } from "vitest";
import type { AxiosInstance } from "axios";
import { CryptaScreenClient } from "../src/index.js";

const baseOf = (c: CryptaScreenClient) => (c as unknown as { http: AxiosInstance }).http.defaults.baseURL;

describe("one public host", () => {
  it("every key goes to api.cryptascreen.com, which routes by the key's data region", () => {
    expect(baseOf(new CryptaScreenClient({ apiKey: "csk_us_synthetic" }))).toBe("https://api.cryptascreen.com");
    expect(baseOf(new CryptaScreenClient({ apiKey: "csk_eu_synthetic" }))).toBe("https://api.cryptascreen.com");
    expect(baseOf(new CryptaScreenClient({ apiKey: "k" }))).toBe("https://api.cryptascreen.com");
  });

  it("baseUrl alone is used as given", () => {
    expect(baseOf(new CryptaScreenClient({ apiKey: "k", baseUrl: "http://localhost:1" }))).toBe("http://localhost:1");
  });

  it("there is no region option", () => {
    // @ts-expect-error region is not a client option
    const c = new CryptaScreenClient({ apiKey: "k", region: "us" });
    expect(baseOf(c)).toBe("https://api.cryptascreen.com");
  });
});
