import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clean existing records if any
  await prisma.executionTelemetry.deleteMany();
  await prisma.submission.deleteMany();
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

  // 4. Create Problems
  // Problem 1: Two Sum
  const twoSum = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'EASY',
      tags: ['Array', 'Hash Table'],
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Output the two indices as space-separated integers, or JSON array format.

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
    # Write your solution here
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
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
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
      },
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          {
            input: '2 7 11 15\n9',
            expectedOutput: '0 1',
            isHidden: false,
            order: 1,
          },
          {
            input: '3 2 4\n6',
            expectedOutput: '1 2',
            isHidden: false,
            order: 2,
          },
          {
            input: '3 3\n6',
            expectedOutput: '0 1',
            isHidden: true,
            order: 3,
          },
          {
            input: '1 5 8 12 19 33\n31',
            expectedOutput: '3 4',
            isHidden: true,
            order: 4,
          },
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

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print \`true\` if valid, else \`false\`.

### Example 1:
\`\`\`
Input:
()[]{}
Output:
true
\`\`\`

### Example 2:
\`\`\`
Input:
(]
Output:
false
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
          {
            input: '()[]{}',
            expectedOutput: 'true',
            isHidden: false,
            order: 1,
          },
          {
            input: '(]',
            expectedOutput: 'false',
            isHidden: false,
            order: 2,
          },
          {
            input: '([{}])',
            expectedOutput: 'true',
            isHidden: true,
            order: 3,
          },
          {
            input: '([)]',
            expectedOutput: 'false',
            isHidden: true,
            order: 4,
          },
        ],
      },
    },
  });

  // Problem 3: Longest Substring Without Repeating Characters
  const longestSubstring = await prisma.problem.create({
    data: {
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'MEDIUM',
      tags: ['String', 'Sliding Window', 'Hash Table'],
      description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

### Example 1:
\`\`\`
Input:
abcabcbb
Output:
3
\`\`\`
Explanation: The answer is "abc", with the length of 3.

### Example 2:
\`\`\`
Input:
bbbbb
Output:
1
\`\`\``,
      starterCodes: {
        python: `import sys

def length_of_longest_substring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in char_map and char_map[char] >= left:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len

if __name__ == "__main__":
    line = sys.stdin.read().rstrip('\\r\\n')
    print(length_of_longest_substring(line))
`,
        javascript: `const fs = require('fs');

function lengthOfLongestSubstring(s) {
  const map = new Map();
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (map.has(char) && map.get(char) >= left) {
      left = map.get(char) + 1;
    }
    map.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

const input = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');
console.log(lengthOfLongestSubstring(input));
`,
      },
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          {
            input: 'abcabcbb',
            expectedOutput: '3',
            isHidden: false,
            order: 1,
          },
          {
            input: 'bbbbb',
            expectedOutput: '1',
            isHidden: false,
            order: 2,
          },
          {
            input: 'pwwkew',
            expectedOutput: '3',
            isHidden: true,
            order: 3,
          },
        ],
      },
    },
  });

  // 5. Create a Live Interview Session
  const sampleSession = await prisma.interviewSession.create({
    data: {
      title: 'Technical Round: Senior Software Engineer',
      status: 'LIVE',
      interviewerId: interviewer.id,
      candidateId: candidate.id,
      problemId: twoSum.id,
      language: 'python',
      code: twoSum.starterCodes.python,
    },
  });

  console.log(`✅ Seeded 3 problems and sample live interview session: ${sampleSession.id}`);
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
