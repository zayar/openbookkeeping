export declare class OrganizationService {
    static getUserOrganizations(userId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        role: string;
        status: string;
        joinedAt: any;
    }[]>;
    static createOrganization(data: {
        name: string;
        slug: string;
        ownerId: string;
        oaOrganizationId?: string;
        baseCurrency?: string;
    }): Promise<{
        email: string | null;
        name: string;
        state: string | null;
        id: string;
        updatedAt: Date;
        slug: string;
        description: string | null;
        logo: string | null;
        oaOrganizationId: string;
        baseCurrency: string;
        fiscalYearStart: string;
        timezone: string;
        address: string | null;
        city: string | null;
        country: string;
        postalCode: string | null;
        phone: string | null;
        website: string | null;
        taxNumber: string | null;
        registrationNumber: string | null;
        subscriptionStatus: string;
        subscriptionPlan: string;
        billingCycle: string;
        multiCurrency: boolean;
        advancedReporting: boolean;
        apiAccess: boolean;
        createdAt: Date;
    }>;
    static hasAccess(userId: string, organizationId: string): Promise<boolean>;
    static getUserRole(userId: string, organizationId: string): Promise<string | null>;
}
//# sourceMappingURL=organizationService.d.ts.map