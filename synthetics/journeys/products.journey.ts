import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Product Search Journey', ({ page, params }) => {
  monitor.use({
    id: 'product-search-journey',
    schedule: 10,
    tags: ['e-commerce', 'search', 'catalog'],
    screenshots: 'on',
  });

  step('Navigate to products page', async () => {
    await page.goto(`${params.url}/products`);
    await page.waitForSelector('[data-testid="products-heading"]');
  });

  step('Verify products are displayed', async () => {
    await page.waitForSelector('[data-testid="product-list"]');
    const resultsText = await page.locator('[data-testid="results-count"]').textContent();
    expect(resultsText).toContain('products found');
  });

  step('Search for a product by name', async () => {
    await page.fill('[data-testid="search-input"]', 'Laptop');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="product-list"]');
    const resultsText = await page.locator('[data-testid="results-count"]').textContent();
    expect(resultsText).toContain('products found');
  });

  step('Filter by category', async () => {
    await page.fill('[data-testid="search-input"]', '');
    await page.selectOption('[data-testid="category-filter"]', 'Electronics');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="product-list"]');
  });

  step('Verify filtered results', async () => {
    const resultsText = await page.locator('[data-testid="results-count"]').textContent();
    expect(resultsText).toContain('products found');
  });
});
