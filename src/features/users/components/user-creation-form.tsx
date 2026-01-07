"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateUserWithRole, type CreateUserWithRoleInput } from "@/features/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

type UserRole = "admin" | "area_manager" | "branch_officer" | "regular";

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "area_manager", label: "Area Manager" },
  { value: "branch_officer", label: "Branch Officer" },
  { value: "regular", label: "Regular User" },
];

export function UserCreationForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateUserWithRoleInput>({
    email: "",
    firstName: "",
    lastName: "",
    role: "regular",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserWithRoleInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createUserMutation = useCreateUserWithRole({
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Redirect to user detail page
        router.push(`/admin/users/${data.data.id}`);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      // Handle error
      if (error.message.includes("email")) {
        setErrors({ email: error.message });
      } else {
        setErrors({ email: error.message });
      }
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateUserWithRoleInput, string>> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await createUserMutation.mutateAsync(formData);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateUserWithRoleInput,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Email *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isSubmitting}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* First Name Field */}
          <div className="space-y-2">
            <label
              htmlFor="firstName"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              First Name *
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              disabled={isSubmitting}
              className={errors.firstName ? "border-destructive" : ""}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name Field */}
          <div className="space-y-2">
            <label
              htmlFor="lastName"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Last Name *
            </label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              disabled={isSubmitting}
              className={errors.lastName ? "border-destructive" : ""}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label
              htmlFor="role"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Role *
            </label>
            <Select
              id="role"
              value={formData.role}
              onValueChange={(value) =>
                handleInputChange("role", value as UserRole)
              }
              disabled={isSubmitting}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/users")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2 size-4" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
