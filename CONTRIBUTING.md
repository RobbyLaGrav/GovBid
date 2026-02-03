# Contributing to GovBid Pro

First off, thank you for considering contributing to GovBid Pro! It's people like you that make GovBid Pro such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Be respectful and inclusive
- Be collaborative
- Be professional
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**
- **Include your environment details** (OS, Node version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**
- **List some other applications where this enhancement exists** (if applicable)

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the TypeScript styleguide
- Include thoughtfully-worded, well-structured tests
- Document new code based on the Documentation Styleguide
- End all files with a newline

## Development Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/govbid-pro.git
cd govbid-pro
```

### 2. Set Up Development Environment

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
cd backend
pnpm prisma migrate dev
pnpm prisma db seed
cd ..

# Start development servers
pnpm dev
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 4. Make Your Changes

- Write clear, readable code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

### 5. Test Your Changes

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Run type checking
pnpm type-check
```

### 6. Commit Your Changes

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Feature
git commit -m "feat: add AI-powered contract matching"

# Bug fix
git commit -m "fix: resolve duplicate contract entries"

# Documentation
git commit -m "docs: update API documentation"

# Refactor
git commit -m "refactor: simplify bid compiler logic"

# Tests
git commit -m "test: add tests for BOM generator"
```

Commit types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### 7. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then go to GitHub and create a Pull Request.

## Styleguides

### TypeScript Styleguide

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use proper TypeScript types (avoid `any`)
- Follow functional programming principles where appropriate

```typescript
// Good
const calculateTotalCost = (items: BOMItem[]): number => {
  return items.reduce((sum, item) => sum + item.cost, 0);
};

// Bad
function calc(arr: any) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i].cost;
  }
  return total;
}
```

### React Component Styleguide

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript interfaces for props
- Organize imports: external, internal, styles
- Use meaningful component and file names

```typescript
// Good
import React from 'react';
import { Box, Typography } from '@mui/material';
import { ContractCard } from '@/components';
import { Contract } from '@/types';
import styles from './ContractList.module.css';

interface ContractListProps {
  contracts: Contract[];
  onSelectContract: (id: string) => void;
}

export const ContractList: React.FC<ContractListProps> = ({
  contracts,
  onSelectContract,
}) => {
  return (
    <Box>
      {contracts.map((contract) => (
        <ContractCard
          key={contract.id}
          contract={contract}
          onClick={() => onSelectContract(contract.id)}
        />
      ))}
    </Box>
  );
};
```

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

```
feat: add Bill of Materials generator with 3 pricing tiers

- Implement aggressive pricing strategy
- Implement competitive pricing strategy
- Implement premium pricing strategy
- Add vendor integration (Home Depot, Lowe's)
- Generate product links and SKUs

Closes #123
```

### Documentation Styleguide

- Use Markdown for documentation
- Include code examples
- Keep it concise but complete
- Update README when adding major features
- Document environment variables in .env.example

## Project Structure

Please maintain the existing project structure:

```
govbid-pro/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── ai-services/       # Python AI/ML services
├── scrapers/          # Contract scraping services
├── shared/            # Shared types and utilities
├── database/          # Database schemas and migrations
├── infrastructure/    # Docker, K8s, Terraform
└── docs/              # Documentation
```

## Testing

- Write unit tests for utilities and services
- Write integration tests for API endpoints
- Write E2E tests for critical user flows
- Aim for at least 80% code coverage

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer must approve
3. All comments must be resolved
4. Code must be up to date with main branch

## Questions?

Feel free to:
- Open an issue for questions
- Join our Discord community
- Email us at dev@govbidpro.com

Thank you for contributing! 🎉
