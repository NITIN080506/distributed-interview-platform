/**
 * Problem Importer Service
 * Supports importing problems from LeetCode GraphQL API, Curated Problem Packs (Blind 75 / NeetCode),
 * and custom JSON problem schemas.
 */

export function extractSlug(input) {
  if (!input) return '';
  const trimmed = input.trim();
  // Handle URLs like https://leetcode.com/problems/invert-binary-tree/ or leetcode.com/problems/invert-binary-tree/description
  const match = trimmed.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  if (match) {
    return match[1].toLowerCase();
  }
  // Otherwise treat as bare slug
  return trimmed.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

export function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<ul>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fetch problem data from LeetCode public GraphQL endpoint
 */
export async function fetchLeetCodeProblem(urlOrSlug) {
  const slug = extractSlug(urlOrSlug);
  if (!slug) {
    throw new Error('Invalid LeetCode problem URL or slug.');
  }

  const query = `query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      title
      titleSlug
      content
      difficulty
      topicTags {
        name
        slug
      }
      codeSnippets {
        lang
        langSlug
        code
      }
      sampleTestCase
      exampleTestcases
    }
  }`;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      query,
      variables: { titleSlug: slug },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API returned status ${response.status}`);
  }

  const json = await response.json();
  const q = json?.data?.question;
  if (!q) {
    throw new Error(`Problem "${slug}" not found on LeetCode.`);
  }

  // Normalize difficulty
  let difficulty = 'MEDIUM';
  if (q.difficulty?.toUpperCase() === 'EASY') difficulty = 'EASY';
  if (q.difficulty?.toUpperCase() === 'HARD') difficulty = 'HARD';

  // Normalize starter codes
  const starterCodes = {};
  if (Array.isArray(q.codeSnippets)) {
    const pythonSnippet = q.codeSnippets.find((s) => s.langSlug === 'python3' || s.langSlug === 'python');
    const jsSnippet = q.codeSnippets.find((s) => s.langSlug === 'javascript');
    const cppSnippet = q.codeSnippets.find((s) => s.langSlug === 'cpp');
    const javaSnippet = q.codeSnippets.find((s) => s.langSlug === 'java');
    const goSnippet = q.codeSnippets.find((s) => s.langSlug === 'golang');

    if (pythonSnippet) starterCodes.python = pythonSnippet.code;
    if (jsSnippet) starterCodes.javascript = jsSnippet.code;
    if (cppSnippet) starterCodes.cpp = cppSnippet.code;
    if (javaSnippet) starterCodes.java = javaSnippet.code;
    if (goSnippet) starterCodes.go = goSnippet.code;
  }

  // Fallbacks for starter codes if language snippet was missing
  if (!starterCodes.python) starterCodes.python = '# Write your solution in Python 3\nclass Solution:\n    def solve(self):\n        pass\n';
  if (!starterCodes.javascript) starterCodes.javascript = '// Write your solution in JavaScript\nfunction solve() {\n}\n';
  if (!starterCodes.cpp) starterCodes.cpp = '#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}\n';
  if (!starterCodes.java) starterCodes.java = 'public class Solution {\n    public static void main(String[] args) {\n    }\n}\n';
  if (!starterCodes.go) starterCodes.go = 'package main\nimport "fmt"\nfunc main() {\n}\n';

  // Extract test cases from exampleTestcases and content
  const testCases = [];
  const rawExamples = (q.exampleTestcases || q.sampleTestCase || '').trim().split('\n').filter(Boolean);

  // Extract expected outputs from content HTML using regex (Example X: ... Output: ...)
  const expectedOutputs = [];
  const outputMatches = (q.content || '').matchAll(/Output:?\s*<\/strong>\s*(?:<code>)?(.*?)(?:<\/code>)?\s*</gi);
  for (const m of outputMatches) {
    if (m[1]) {
      expectedOutputs.push(m[1].replace(/<[^>]+>/g, '').trim());
    }
  }

  if (rawExamples.length > 0) {
    // LeetCode multi-line inputs can group into test cases
    const inputChunk = rawExamples.slice(0, 3);
    inputChunk.forEach((inp, idx) => {
      testCases.push({
        input: inp,
        expectedOutput: expectedOutputs[idx] || 'true',
        isHidden: idx > 1,
        order: idx + 1,
      });
    });
  }

  if (testCases.length === 0) {
    testCases.push({
      input: q.sampleTestCase || '[1, 2, 3]',
      expectedOutput: expectedOutputs[0] || 'true',
      isHidden: false,
      order: 1,
    });
  }

  return {
    title: q.title,
    slug: q.titleSlug,
    description: cleanHtml(q.content),
    difficulty,
    tags: (q.topicTags || []).map((t) => t.name),
    starterCodes,
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases,
  };
}

/**
 * Curated Problem Packs (Blind 75 & NeetCode Top Interview Essentials)
 * Pre-formatted with test cases, starter codes, and clean markdown for instant 1-click import.
 */
export const CURATED_PACKS = {
  blind75: [
    {
      title: 'Valid Palindrome',
      slug: 'valid-palindrome',
      difficulty: 'EASY',
      tags: ['Two Pointers', 'String'],
      description: `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

**Example 1:**
Input: s = "A man, a plan, a canal: Panama"
Output: true
Explanation: "amanaplanacanalpanama" is a palindrome.

**Example 2:**
Input: s = "race a car"
Output: false
Explanation: "raceacar" is not a palindrome.

**Constraints:**
- \`1 <= s.length <= 2 * 10^5\`
- \`s\` consists only of printable ASCII characters.`,
      starterCodes: {
        python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        filtered = [c.lower() for c in s if c.isalnum()]
        return filtered == filtered[::-1]

import sys
if __name__ == "__main__":
    line = sys.stdin.read().strip()
    print("true" if Solution().isPalindrome(line) else "false")
`,
        javascript: `function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isPalindrome(input) ? "true" : "false");
`,
        cpp: `#include <iostream>
#include <string>
#include <cctype>
#include <algorithm>
using namespace std;

bool isPalindrome(string s) {
    string clean = "";
    for (char c : s) {
        if (isalnum(c)) clean += tolower(c);
    }
    string rev = clean;
    reverse(rev.begin(), rev.end());
    return clean == rev;
}

int main() {
    string s;
    getline(cin, s);
    cout << (isPalindrome(s) ? "true" : "false") << endl;
    return 0;
}
`,
        java: `import java.util.Scanner;

public class Solution {
    public static boolean isPalindrome(String s) {
        String clean = s.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        String rev = new StringBuilder(clean).reverse().toString();
        return clean.equals(rev);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            System.out.println(isPalindrome(sc.nextLine()) ? "true" : "false");
        }
    }
}
`,
        go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
    "unicode"
)

func isPalindrome(s string) bool {
    var b strings.Builder
    for _, r := range strings.ToLower(s) {
        if unicode.IsLetter(r) || unicode.IsDigit(r) {
            b.WriteRune(r)
        }
    }
    str := b.String()
    n := len(str)
    for i := 0; i < n/2; i++ {
        if str[i] != str[n-1-i] {
            return false
        }
    }
    return true
}

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        if isPalindrome(scanner.Text()) {
            fmt.Println("true")
        } else {
            fmt.Println("false")
        }
    }
}
`,
      },
      testCases: [
        { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true', isHidden: false, order: 1 },
        { input: 'race a car', expectedOutput: 'false', isHidden: false, order: 2 },
        { input: ' ', expectedOutput: 'true', isHidden: true, order: 3 },
      ],
    },
    {
      title: 'Best Time to Buy and Sell Stock',
      slug: 'best-time-to-buy-and-sell-stock',
      difficulty: 'EASY',
      tags: ['Array', 'Dynamic Programming', 'Sliding Window'],
      description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.

**Example 1:**
Input: prices = [7,1,5,3,6,4]
Output: 5
Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.

**Example 2:**
Input: prices = [7,6,4,3,1]
Output: 0
Explanation: In this case, no transactions are done and the max profit = 0.`,
      starterCodes: {
        python: `import sys, json

class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        min_price = float('inf')
        max_profit = 0
        for price in prices:
            if price < min_price:
                min_price = price
            elif price - min_price > max_profit:
                max_profit = price - min_price
        return max_profit

if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    nums = json.loads(raw)
    print(Solution().maxProfit(nums))
`,
        javascript: `const fs = require('fs');

function maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  for (const price of prices) {
    if (price < minPrice) minPrice = price;
    else if (price - minPrice > maxProfit) maxProfit = price - minPrice;
  }
  return maxProfit;
}

const input = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
console.log(maxProfit(input));
`,
        cpp: `#include <iostream>
#include <vector>
#include <sstream>
#include <climits>
using namespace std;

int maxProfit(vector<int>& prices) {
    int minP = INT_MAX, maxP = 0;
    for (int p : prices) {
        if (p < minP) minP = p;
        else if (p - minP > maxP) maxP = p - minP;
    }
    return maxP;
}

int main() {
    string line;
    getline(cin, line);
    vector<int> prices;
    for (char &c : line) if (c == '[' || c == ']' || c == ',') c = ' ';
    stringstream ss(line);
    int val;
    while (ss >> val) prices.push_back(val);
    cout << maxProfit(prices) << endl;
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE;
        int maxProfit = 0;
        for (int p : prices) {
            if (p < minPrice) minPrice = p;
            else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
        }
        return maxProfit;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine().replaceAll("[\\[\\] ]", "");
            String[] parts = s.split(",");
            int[] prices = new int[parts.length];
            for (int i = 0; i < parts.length; i++) prices[i] = Integer.parseInt(parts[i]);
            System.out.println(maxProfit(prices));
        }
    }
}
`,
        go: `package main

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
)

func maxProfit(prices []int) int {
    minPrice := int(^uint(0) >> 1)
    maxProfit := 0
    for _, p := range prices {
        if p < minPrice {
            minPrice = p
        } else if p - minPrice > maxProfit {
            maxProfit = p - minPrice
        }
    }
    return maxProfit
}

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        var prices []int
        json.Unmarshal([]byte(scanner.Text()), &prices)
        fmt.Println(maxProfit(prices))
    }
}
`,
      },
      testCases: [
        { input: '[7,1,5,3,6,4]', expectedOutput: '5', isHidden: false, order: 1 },
        { input: '[7,6,4,3,1]', expectedOutput: '0', isHidden: false, order: 2 },
        { input: '[2,4,1]', expectedOutput: '2', isHidden: true, order: 3 },
      ],
    },
    {
      title: 'Contains Duplicate',
      slug: 'contains-duplicate',
      difficulty: 'EASY',
      tags: ['Array', 'Hash Table', 'Sorting'],
      description: `Given an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.

**Example 1:**
Input: nums = [1,2,3,1]
Output: true

**Example 2:**
Input: nums = [1,2,3,4]
Output: false

**Example 3:**
Input: nums = [1,1,1,3,3,4,3,2,4,2]
Output: true`,
      starterCodes: {
        python: `import sys, json

class Solution:
    def containsDuplicate(self, nums: list[int]) -> bool:
        return len(nums) != len(set(nums))

if __name__ == "__main__":
    nums = json.loads(sys.stdin.read().strip())
    print("true" if Solution().containsDuplicate(nums) else "false")
`,
        javascript: `const fs = require('fs');

function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}

const nums = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
console.log(containsDuplicate(nums) ? "true" : "false");
`,
        cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
#include <sstream>
using namespace std;

bool containsDuplicate(vector<int>& nums) {
    unordered_set<int> seen;
    for (int n : nums) {
        if (seen.count(n)) return true;
        seen.insert(n);
    }
    return false;
}

int main() {
    string line;
    getline(cin, line);
    vector<int> nums;
    for (char &c : line) if (c == '[' || c == ']' || c == ',') c = ' ';
    stringstream ss(line);
    int v;
    while (ss >> v) nums.push_back(v);
    cout << (containsDuplicate(nums) ? "true" : "false") << endl;
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static boolean containsDuplicate(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int n : nums) {
            if (!set.add(n)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine().replaceAll("[\\[\\] ]", "");
            String[] parts = s.split(",");
            int[] nums = new int[parts.length];
            for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
            System.out.println(containsDuplicate(nums) ? "true" : "false");
        }
    }
}
`,
        go: `package main

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
)

func containsDuplicate(nums []int) bool {
    seen := make(map[int]bool)
    for _, n := range nums {
        if seen[n] {
            return true
        }
        seen[n] = true
    }
    return false
}

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        var nums []int
        json.Unmarshal([]byte(scanner.Text()), &nums)
        if containsDuplicate(nums) {
            fmt.Println("true")
        } else {
            fmt.Println("false")
        }
    }
}
`,
      },
      testCases: [
        { input: '[1,2,3,1]', expectedOutput: 'true', isHidden: false, order: 1 },
        { input: '[1,2,3,4]', expectedOutput: 'false', isHidden: false, order: 2 },
        { input: '[1,1,1,3,3,4,3,2,4,2]', expectedOutput: 'true', isHidden: true, order: 3 },
      ],
    },
    {
      title: 'Maximum Subarray',
      slug: 'maximum-subarray',
      difficulty: 'MEDIUM',
      tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'],
      description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.

**Example 1:**
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.

**Example 2:**
Input: nums = [1]
Output: 1

**Example 3:**
Input: nums = [5,4,-1,7,8]
Output: 23`,
      starterCodes: {
        python: `import sys, json

class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        cur_sum = 0
        max_sum = nums[0]
        for n in nums:
            cur_sum = max(n, cur_sum + n)
            max_sum = max(max_sum, cur_sum)
        return max_sum

if __name__ == "__main__":
    nums = json.loads(sys.stdin.read().strip())
    print(Solution().maxSubArray(nums))
`,
        javascript: `const fs = require('fs');

function maxSubArray(nums) {
  let cur = 0;
  let max = nums[0];
  for (const n of nums) {
    cur = Math.max(n, cur + n);
    max = Math.max(max, cur);
  }
  return max;
}

const nums = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
console.log(maxSubArray(nums));
`,
        cpp: `#include <iostream>
#include <vector>
#include <sstream>
#include <algorithm>
using namespace std;

int maxSubArray(vector<int>& nums) {
    int cur = 0, maxVal = nums[0];
    for (int n : nums) {
        cur = max(n, cur + n);
        maxVal = max(maxVal, cur);
    }
    return maxVal;
}

int main() {
    string line;
    getline(cin, line);
    vector<int> nums;
    for (char &c : line) if (c == '[' || c == ']' || c == ',') c = ' ';
    stringstream ss(line);
    int v;
    while (ss >> v) nums.push_back(v);
    cout << maxSubArray(nums) << endl;
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static int maxSubArray(int[] nums) {
        int cur = 0, maxVal = nums[0];
        for (int n : nums) {
            cur = Math.max(n, cur + n);
            maxVal = Math.max(maxVal, cur);
        }
        return maxVal;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine().replaceAll("[\\[\\] ]", "");
            String[] parts = s.split(",");
            int[] nums = new int[parts.length];
            for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
            System.out.println(maxSubArray(nums));
        }
    }
}
`,
        go: `package main

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
)

func maxSubArray(nums []int) int {
    cur := 0
    maxVal := nums[0]
    for _, n := range nums {
        if n > cur+n {
            cur = n
        } else {
            cur = cur + n
        }
        if cur > maxVal {
            maxVal = cur
        }
    }
    return maxVal
}

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        var nums []int
        json.Unmarshal([]byte(scanner.Text()), &nums)
        fmt.Println(maxSubArray(nums))
    }
}
`,
      },
      testCases: [
        { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false, order: 1 },
        { input: '[1]', expectedOutput: '1', isHidden: false, order: 2 },
        { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true, order: 3 },
      ],
    },
    {
      title: 'Climbing Stairs',
      slug: 'climbing-stairs',
      difficulty: 'EASY',
      tags: ['Math', 'Dynamic Programming', 'Memoization'],
      description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

**Example 1:**
Input: n = 2
Output: 2
Explanation: There are two ways to climb to the top.
1. 1 step + 1 step
2. 2 steps

**Example 2:**
Input: n = 3
Output: 3
Explanation: There are three ways to climb to the top.
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step`,
      starterCodes: {
        python: `import sys

class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2: return n
        a, b = 1, 2
        for _ in range(3, n + 1):
            a, b = b, a + b
        return b

if __name__ == "__main__":
    n = int(sys.stdin.read().strip())
    print(Solution().climbStairs(n))
`,
        javascript: `const fs = require('fs');

function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    const tmp = a + b;
    a = b;
    b = tmp;
  }
  return b;
}

const n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);
console.log(climbStairs(n));
`,
        cpp: `#include <iostream>
using namespace std;

int climbStairs(int n) {
    if (n <= 2) return n;
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int tmp = a + b;
        a = b;
        b = tmp;
    }
    return b;
}

int main() {
    int n;
    if (cin >> n) cout << climbStairs(n) << endl;
    return 0;
}
`,
        java: `import java.util.Scanner;

public class Solution {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int tmp = a + b;
            a = b;
            b = tmp;
        }
        return b;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) System.out.println(climbStairs(sc.nextInt()));
    }
}
`,
        go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
)

func climbStairs(n int) int {
    if n <= 2 {
        return n
    }
    a, b := 1, 2
    for i := 3; i <= n; i++ {
        a, b = b, a+b
    }
    return b
}

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        n, _ := strconv.Atoi(scanner.Text())
        fmt.Println(climbStairs(n))
    }
}
`,
      },
      testCases: [
        { input: '2', expectedOutput: '2', isHidden: false, order: 1 },
        { input: '3', expectedOutput: '3', isHidden: false, order: 2 },
        { input: '5', expectedOutput: '8', isHidden: true, order: 3 },
      ],
    },
  ],
};
