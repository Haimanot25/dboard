# Contributing to DBoard

Thank you for your interest in contributing to DBoard! This guide will help you get started.

## Development Environment Setup

1. **Fork and clone the repository:**

```bash
git clone https://github.com/Haimanot25/dboard.git
cd dboard
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize the database:**

```bash
npx prisma generate
npx prisma db push
```

5. **Start the development server:**

```bash
npm run dev
```

## Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing code structure and patterns
- Use ESLint and Prettier for code formatting
- Write meaningful variable and function names
- Add comments for complex logic (but avoid over-commenting)
- Keep components small and focused on a single responsibility

### Naming Conventions

- **Files:** Use PascalCase for components (e.g., `UserProfile.tsx`), camelCase for utilities (e.g., `formatDate.ts`)
- **Variables/Functions:** Use camelCase (e.g., `getUserById`, `isAuthenticated`)
- **Components:** Use PascalCase (e.g., `DatabaseCard`, `QueryEditor`)
- **Types/Interfaces:** Use PascalCase with descriptive names (e.g., `DatabaseConnection`, `UserProfile`)

## Pull Request Process

1. **Create a feature branch:**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes:**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Ensure all existing tests pass

3. **Commit your changes:**
   - Use clear, descriptive commit messages
   - Follow conventional commits format: `type(scope): description`
   - Examples:
     - `feat(databases): add PostgreSQL connection support`
     - `fix(auth): resolve session refresh issue`
     - `docs(readme): update installation instructions`

4. **Push to your fork:**

```bash
git push origin feature/your-feature-name
```

5. **Create a Pull Request:**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure CI checks pass

## Issue Reporting Guidelines

When reporting issues, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs **actual behavior**
4. **Environment details:**
   - Operating system
   - Node.js version
   - Browser (if applicable)
   - Package version
5. **Screenshots** or **error messages** if applicable

Use the issue templates when available.

## Testing Instructions

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for utility functions
- Write integration tests for API routes
- Write component tests using React Testing Library
- Aim for meaningful test coverage, not just high percentages

### Test File Structure

- Place tests alongside the code they test
- Use `.test.ts` or `.test.tsx` suffix
- Mirror the source directory structure in test directories

## Questions?

If you have questions about contributing, feel free to open an issue with the label "question" or reach out to the maintainers.