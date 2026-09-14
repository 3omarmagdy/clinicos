import { test, expect, type Page, type Route } from '@playwright/test';

const user = {
  id: 'user-a',
  email: 'owner@example.test',
  firstName: 'Clinic',
  lastName: 'Owner',
  role: 'owner',
  organizationId: 'org-a',
};

const organization = { id: 'org-a', name: 'Test Clinic', facilityType: 'CLINIC', specialty: 'DENTAL' };
const permissions = ['organization:read', 'appointment:read', 'appointment:create', 'appointment:update', 'audit:read'];

async function installSessionMocks(page: Page, options: { expireAfterUserRequest?: boolean; dashboardFailureStatus?: number } = {}) {
  let userRequests = 0;
  await page.context().addCookies([
    { name: 'clinicos_session', value: Buffer.from(JSON.stringify({ permissions, isPlatformAdmin: false })).toString('base64url'), url: 'http://127.0.0.1:3000' },
  ]);

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/users/me')) {
      userRequests += 1;
      if (options.expireAfterUserRequest && userRequests > 1) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ statusCode: 401, message: 'Session expired', requestId: 'e2e-expired' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
      return;
    }
    if (path.includes('/organizations/org-a') && !path.endsWith('/dashboard')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(organization) });
      return;
    }
    if (path.endsWith('/organizations/me/dashboard')) {
      if (options.dashboardFailureStatus) {
        await route.fulfill({ status: options.dashboardFailureStatus, contentType: 'application/json', body: JSON.stringify({ statusCode: options.dashboardFailureStatus, message: 'Secondary endpoint failure', requestId: 'e2e-secondary-failure' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ patients: 1, consentedPatients: 1, newPatientsThisMonth: 1, todayAppointments: 0, upcomingAppointments: 0, todayByStatus: {} }) });
      return;
    }
    if (path.includes('/appointments/doctors')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }
    if (path.includes('/organizations/me/services')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }
    if (path.includes('/appointments')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }
    if (path.endsWith('/reminders')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

test.describe('session continuity and expiry', () => {
  test('survives refresh, new tab, and navigation across core workspace pages', async ({ page, context }) => {
    await installSessionMocks(page);
    await page.goto('/dashboard');
    await expect(page.getByText('إدارة العيادة')).toBeVisible();

    await page.reload();
    await expect(page.getByText('إدارة العيادة')).toBeVisible();

    const newTab = await context.newPage();
    await installSessionMocks(newTab);
    await newTab.goto('/appointments');
    await expect(newTab).toHaveURL(/\/appointments$/);
    await expect(newTab.getByRole('heading', { name: /Appointment Desk/ })).toBeVisible();

    await newTab.goto('/reminders');
    await expect(newTab).toHaveURL(/\/reminders$/);
    await expect(newTab.getByText('تذكيرات المواعيد')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await newTab.close();
  });

  test('does not log out globally when a secondary dashboard endpoint returns 500', async ({ page }) => {
    await installSessionMocks(page, { dashboardFailureStatus: 500 });
    await page.goto('/dashboard');
    await expect(page.getByText('إدارة العيادة')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('تعذر تحميل مؤشرات العيادة.')).toBeVisible();
  });

  test('clears the session hint and shows login guidance after JWT expiry', async ({ page }) => {
    await installSessionMocks(page, { expireAfterUserRequest: true });
    await page.goto('/dashboard');
    await expect(page.getByText('إدارة العيادة')).toBeVisible();

    await page.reload();
    await expect(page.getByText('انتهت الجلسة، سجّل الدخول مرة أخرى.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'تسجيل الدخول' })).toBeVisible();
    await expect(page).not.toHaveURL(/\/appointments|\/reminders/);
    expect(await page.evaluate(() => document.cookie)).not.toContain('clinicos_session=');
  });
});
