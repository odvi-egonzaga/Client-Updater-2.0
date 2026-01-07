import { vi } from "vitest";

// Mock Clerk
export const mockClerkClient = {
  users: {
    getUser: vi.fn(),
    getUserList: vi.fn(),
  },
  organizations: {
    getOrganizationMembershipList: vi.fn(),
    getOrganizationList: vi.fn(),
  },
};

vi.mock("@clerk/nextjs", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  UserButton: vi.fn(() => null),
  SignIn: vi.fn(() => null),
  SignUp: vi.fn(() => null),
  useUser: vi.fn(() => ({
    user: null,
    isLoaded: true,
  })),
  useAuth: vi.fn(() => ({
    userId: null,
    sessionId: null,
    isLoaded: true,
  })),
}));

export default mockClerkClient;
