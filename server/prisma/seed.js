import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with production problem set and users...');

  // 1. Clean existing records safely
  await prisma.executionTelemetry.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.scorecard.deleteMany();
  await prisma.interviewAuditLog.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash password
  const passwordHash = await bcrypt.hash('password123', 10);

  // 3. Create Users
  const interviewer = await prisma.user.create({
    data: {
      name: 'Dr. Sarah Connor (Interviewer)',
      email: 'interviewer@example.com',
      password: passwordHash,
      role: 'INTERVIEWER',
    },
  });

  const candidate = await prisma.user.create({
    data: {
      name: 'Alex Rivera (Candidate)',
      email: 'candidate@example.com',
      password: passwordHash,
      role: 'CANDIDATE',
    },
  });

  console.log('✅ Created users:');
  console.log(`   Interviewer: ${interviewer.email}`);
  console.log(`   Candidate:   ${candidate.email}`);

  // 4. Create Curated Interview Problem Bank
  // Problem 1: Two Sum
  const twoSum = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'EASY',
      tags: ['Array', 'Hash Table', 'FAANG'],
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

Output the two indices as space-separated integers.

### Example 1:
\`\`\`
Input:
2 7 11 15
9
Output:
0 1
\`\`\`

### Example 2:
\`\`\`
Input:
3 2 4
6
Output:
1 2
\`\`\``,
      starterCodes: {
        python: `import sys

def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

if __name__ == "__main__":
    lines = sys.stdin.read().splitlines()
    if len(lines) >= 2:
        nums = list(map(int, lines[0].strip().split()))
        target = int(lines[1].strip())
        res = two_sum(nums, target)
        print(f"{res[0]} {res[1]}")
`,
        javascript: `const fs = require('fs');

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
  return [];
}

const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length >= 2) {
  const nums = input[0].trim().split(/\\s+/).map(Number);
  const target = Number(input[1].trim());
  const res = twoSum(nums, target);
  console.log(\`\${res[0]} \${res[1]}\`);
}
`,
        cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <sstream>

using namespace std;

int main() {
    string line;
    if (getline(cin, line)) {
        stringstream ss(line);
        vector<int> nums;
        int n, target;
        while (ss >> n) nums.push_back(n);
        if (cin >> target) {
            unordered_map<int, int> seen;
            for (int i = 0; i < nums.size(); i++) {
                int diff = target - nums[i];
                if (seen.count(diff)) {
                    cout << seen[diff] << " " << i << endl;
                    return 0;
                }
                seen[nums[i]] = i;
            }
        }
    }
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int target = sc.nextInt();
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);

        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) {
                System.out.println(map.get(diff) + " " + i);
                return;
            }
            map.put(nums[i], i);
        }
    }
}
`,
        go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
)

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if !scanner.Scan() {
        return
    }
    numsStr := strings.Fields(scanner.Text())
    if !scanner.Scan() {
        return
    }
    target, _ := strconv.Atoi(strings.TrimSpace(scanner.Text()))

    seen := make(map[int]int)
    for i, s := range numsStr {
        n, _ := strconv.Atoi(s)
        diff := target - n
        if idx, ok := seen[diff]; ok {
            fmt.Printf("%d %d\\n", idx, i)
            return
        }
        seen[n] = i
    }
}
`,
      },
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: '2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, order: 1 },
          { input: '3 2 4\n6', expectedOutput: '1 2', isHidden: false, order: 2 },
          { input: '3 3\n6', expectedOutput: '0 1', isHidden: true, order: 3 },
          { input: '1 5 8 12 19 33\n31', expectedOutput: '3 4', isHidden: true, order: 4 },
        ],
      },
    },
  });

  // Problem 2: Valid Parentheses
  const validParentheses = await prisma.problem.create({
    data: {
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      difficulty: 'EASY',
      tags: ['String', 'Stack'],
      description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

Print \`true\` if valid, else \`false\`.

### Example 1:
\`\`\`
Input:
()[]{}
Output:
true
\`\`\``,
      starterCodes: {
        python: `import sys

def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    print("true" if is_valid(line) else "false")
`,
        javascript: `const fs = require('fs');

function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (map[char]) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(input) ? 'true' : 'false');
`,
      },
      timeLimitMs: 1500,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: '()[]{}', expectedOutput: 'true', isHidden: false, order: 1 },
          { input: '(]', expectedOutput: 'false', isHidden: false, order: 2 },
          { input: '([{}])', expectedOutput: 'true', isHidden: true, order: 3 },
          { input: '([)]', expectedOutput: 'false', isHidden: true, order: 4 },
        ],
      },
    },
  });

  // Problem 3: Number of Islands (Graph / BFS / DFS)
  const numberOfIslands = await prisma.problem.create({
    data: {
      title: 'Number of Islands',
      slug: 'number-of-islands',
      difficulty: 'MEDIUM',
      tags: ['Graph', 'BFS', 'DFS', 'Matrix'],
      description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

First line: \`m n\`
Following \`m\` lines: rows with \`n\` space-separated binary values.

### Example:
\`\`\`
Input:
4 5
1 1 1 1 0
1 1 0 1 0
1 1 0 0 0
0 0 0 0 0
Output:
1
\`\`\``,
      starterCodes: {
        python: `import sys

def num_islands(grid):
    if not grid:
        return 0
    m, n = len(grid), len(grid[0])
    islands = 0

    def dfs(r, c):
        if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for i in range(m):
        for j in range(n):
            if grid[i][j] == '1':
                islands += 1
                dfs(i, j)
    return islands

if __name__ == "__main__":
    lines = sys.stdin.read().splitlines()
    if lines:
        m, n = map(int, lines[0].split())
        grid = [lines[i + 1].split() for i in range(m)]
        print(num_islands(grid))
`,
        javascript: `const fs = require('fs');

function numIslands(grid) {
  if (!grid.length) return 0;
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;

  function dfs(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }
  return count;
}

const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length > 0) {
  const [m, n] = input[0].trim().split(/\\s+/).map(Number);
  const grid = [];
  for (let i = 1; i <= m; i++) {
    grid.push(input[i].trim().split(/\\s+/));
  }
  console.log(numIslands(grid));
}
`,
      },
      timeLimitMs: 2500,
      memoryLimitMb: 128,
      testCases: {
        create: [
          {
            input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0',
            expectedOutput: '1',
            isHidden: false,
            order: 1,
          },
          {
            input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1',
            expectedOutput: '3',
            isHidden: false,
            order: 2,
          },
          {
            input: '3 3\n0 0 0\n0 0 0\n0 0 0',
            expectedOutput: '0',
            isHidden: true,
            order: 3,
          },
        ],
      },
    },
  });

  // Problem 4: Coin Change (Dynamic Programming)
  const coinChange = await prisma.problem.create({
    data: {
      title: 'Coin Change',
      slug: 'coin-change',
      difficulty: 'MEDIUM',
      tags: ['Dynamic Programming', 'Breadth-First Search'],
      description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

### Example 1:
\`\`\`
Input:
1 2 5
11
Output:
3
\`\`\`
Explanation: 11 = 5 + 5 + 1`,
      starterCodes: {
        python: `import sys

def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1

if __name__ == "__main__":
    lines = sys.stdin.read().splitlines()
    if len(lines) >= 2:
        coins = list(map(int, lines[0].split()))
        amount = int(lines[1].strip())
        print(coin_change(coins, amount))
`,
        javascript: `const fs = require('fs');

function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (const coin of coins) {
    for (let x = coin; x <= amount; x++) {
      dp[x] = Math.min(dp[x], dp[x - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length >= 2) {
  const coins = input[0].trim().split(/\\s+/).map(Number);
  const amount = Number(input[1].trim());
  console.log(coinChange(coins, amount));
}
`,
      },
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: '1 2 5\n11', expectedOutput: '3', isHidden: false, order: 1 },
          { input: '2\n3', expectedOutput: '-1', isHidden: false, order: 2 },
          { input: '1\n0', expectedOutput: '0', isHidden: true, order: 3 },
          { input: '186 419 83 408\n6249', expectedOutput: '20', isHidden: true, order: 4 },
        ],
      },
    },
  });

  // Problem 5: Trapping Rain Water (Hard)
  const trappingRainWater = await prisma.problem.create({
    data: {
      title: 'Trapping Rain Water',
      slug: 'trapping-rain-water',
      difficulty: 'HARD',
      tags: ['Two Pointers', 'Dynamic Programming', 'Monotonic Stack'],
      description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

### Example 1:
\`\`\`
Input:
0 1 0 2 1 0 1 3 2 1 2 1
Output:
6
\`\`\``,
      starterCodes: {
        python: `import sys

def trap(height):
    if not height:
        return 0
    left, right = 0, len(height) - 1
    left_max, right_max = height[left], height[right]
    water = 0

    while left < right:
        if left_max < right_max:
            left += 1
            left_max = max(left_max, height[left])
            water += left_max - height[left]
        else:
            right -= 1
            right_max = max(right_max, height[right])
            water += right_max - height[right]
    return water

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        heights = list(map(int, line.split()))
        print(trap(heights))
`,
      },
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: '0 1 0 2 1 0 1 3 2 1 2 1', expectedOutput: '6', isHidden: false, order: 1 },
          { input: '4 2 0 3 2 5', expectedOutput: '9', isHidden: false, order: 2 },
          { input: '1 2 3 4 5', expectedOutput: '0', isHidden: true, order: 3 },
        ],
      },
    },
  });

  // 5. Create Live Technical Interview Session
  const sampleSession = await prisma.interviewSession.create({
    data: {
      title: 'System & Algorithm Evaluation: Senior Software Engineer',
      status: 'LIVE',
      interviewerId: interviewer.id,
      candidateId: candidate.id,
      problemId: twoSum.id,
      language: 'python',
      code: twoSum.starterCodes.python,
    },
  });

  console.log(`✅ Seeded 5 problems and active interview session: ${sampleSession.id}`);
  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
