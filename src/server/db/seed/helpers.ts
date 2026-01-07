import { faker } from "@faker-js/faker";

// Seed configuration
export const SEED_CONFIG = {
  areas: 3,
  branchesPerArea: { min: 1, max: 3 },
  adminUsers: 1,
  areaManagers: 1,
  branchOfficers: 1,
  regularUsers: 1,
  developerUsers: 1,
  clientsPerBranch: { min: 3, max: 6 },
  statusEventsPerClient: { min: 1, max: 2 },
  syncJobs: 5,
  exportJobs: 3,
  activityLogs: 25,
  configSettings: 8,
} as const;

// Realistic Filipino names
export const FILIPINO_FIRST_NAMES = [
  "Jose", "Maria", "Juan", "Ana", "Carlos", "Carmen", "Pedro", "Rosa",
  "Miguel", "Teresa", "Antonio", "Elena", "Francisco", "Sofia", "Luis",
  "Isabella", "Diego", "Valentina", "Rafael", "Camila", "Alejandro",
  "Victoria", "Fernando", "Lucia", "Gabriel", "Martina", "Nicolas",
  "Julia", "Sebastian", "Daniela", "Mateo", "Emilia", "Andres", "Valeria",
  "Javier", "Adriana", "Santiago", "Renata", "Benjamin", "Sara",
  "Emmanuel", "Alessandra", "Christian", "Beatriz", "Ricardo", "Fernanda",
];

export const FILIPINO_LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Mendoza", "Flores", "Ramos",
  "Castillo", "Torres", "Rivera", "Garcia", "Lopez", "Gonzalez", "Perez",
  "Martinez", "Rodriguez", "Sanchez", "Ramirez", "Cruz", "Morales", "Del Rosario",
  "Dizon", "Tan", "Lim", "Ong", "Lee", "Sy", "Go", "Chua", "Ho", "Ng",
  "Aquino", "Roxas", "Macapagal", "Magsaysay", "Quirino", "Laurel", "Osmeña",
  "Villanueva", "Santiago", "Castillo", "Fernandez", "Reyes", "Dela Cruz",
  "De Leon", "Sarmiento", "Villanueva", "Salvador", "Pineda", "Castillo",
];

// Philippine geographic areas
export const PHILIPPINE_AREAS = [
  { code: "NCR", name: "Metro Manila" },
  { code: "LZN", name: "Luzon North" },
  { code: "VIS", name: "Visayas" },
];

// Philippine cities for branches
export const PHILIPPINE_CITIES = {
  "NCR": ["Makati", "Quezon City", "Manila", "Pasig", "Taguig"],
  "LZN": ["Baguio", "Angeles City", "Cabanatuan", "Olongapo", "San Fernando"],
  "VIS": ["Cebu City", "Mandaue", "Lapu-Lapu", "Iloilo City", "Bacolod"],
};

// Generate realistic Filipino name
export function generateFilipinoName(): string {
  const firstName = faker.helpers.arrayElement(FILIPINO_FIRST_NAMES);
  const lastName = faker.helpers.arrayElement(FILIPINO_LAST_NAMES);
  return `${firstName} ${lastName}`;
}

// Generate SSS number (10 digits)
export function generateSSSNumber(): string {
  const digits = faker.string.numeric(10);
  return `SSS-${digits.substring(0, 2)}-${digits.substring(2, 9)}-${digits.substring(9)}`;
}

// Generate GSIS number
export function generateGSISNumber(): string {
  const digits = faker.string.numeric(11);
  return `GSIS-${digits.substring(0, 2)}-${digits.substring(2, 10)}-${digits.substring(10)}`;
}

// Generate PVAO number
export function generatePVAONumber(): string {
  const digits = faker.string.numeric(8);
  return `PVAO-${digits}`;
}

// Generate PCNI number (PNP or Non-PNP)
export function generatePCNINumber(): string {
  const digits = faker.string.numeric(9);
  return `PCNI-${digits}`;
}

// Generate Philippine mobile number
export function generatePhilippineMobileNumber(): string {
  const prefixes = ["905", "906", "915", "916", "917", "918", "919", "920", "921", "922", "923", "925", "926", "927", "928", "929", "930", "931", "932", "933", "934", "935", "936", "937", "938", "939", "940", "941", "942", "943", "944", "945", "946", "947", "948", "949", "950", "951", "952", "953", "954", "955", "956", "957", "958", "959", "960", "961", "962", "963", "964", "965", "966", "967", "968", "969", "970", "971", "972", "973", "974", "975", "976", "977", "978", "979", "980", "981", "982", "983", "984", "985", "986", "987", "988", "989", "990", "991", "992", "993", "994", "995", "996", "997", "998", "999"];
  const prefix = faker.helpers.arrayElement(prefixes);
  const suffix = faker.string.numeric(7);
  return `09${prefix}${suffix}`;
}

// Generate landline number
export function generateLandlineNumber(): string {
  const areaCode = faker.helpers.arrayElement(["2", "32", "33", "34", "35", "36", "38", "42", "43", "44", "45", "46", "47", "48", "49", "52", "53", "54", "55", "56", "62", "63", "64", "65", "72", "73", "74", "75", "82", "83", "84", "85", "86", "88"]);
  const number = faker.string.numeric(7);
  return `${areaCode}-${number.substring(0, 4)}-${number.substring(4)}`;
}

// Generate client code
export function generateClientCode(prefix: string): string {
  const year = new Date().getFullYear();
  const random = faker.string.numeric(6);
  return `${prefix}-${year}-${random}`;
}

// Generate birth date for pensioner (60-90 years old)
export function generatePensionerBirthDate(): Date {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 90;
  const maxYear = currentYear - 60;
  const year = faker.number.int({ min: minYear, max: maxYear });
  const month = faker.number.int({ min: 1, max: 12 });
  const day = faker.number.int({ min: 1, max: 28 });
  return new Date(year, month - 1, day);
}

// Generate past due amount
export function generatePastDueAmount(): string {
  const amount = faker.number.float({ min: 0, max: 50000, fractionDigits: 2 });
  return amount.toFixed(2);
}

// Get random item from array
export function getRandomItem<T>(array: T[]): T {
  return faker.helpers.arrayElement(array);
}

// Get random integer in range
export function getRandomInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

// Get random boolean with probability
export function getRandomBoolean(probability = 0.5): boolean {
  return faker.datatype.boolean({ probability });
}

// Generate random date in recent days
export function getRecentDate(days = 30): Date {
  return faker.date.recent({ days });
}

// Generate random date in past
export function getPastDate(days = 90): Date {
  const years = days / 365;
  return faker.date.past({ years });
}

// Generate random date between two dates
export function getDateBetween(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}
