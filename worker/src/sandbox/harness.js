/**
 * Language Preamble and LeetCode Harness Generator
 * Automatically injects standard imports (typing, collections, TreeNode, ListNode)
 * and an intelligent execution harness for LeetCode-style `class Solution:` methods.
 */

export function prepareExecutableCode(code, language) {
  if (!code) return '';

  if (language === 'python') {
    return preparePythonCode(code);
  }

  if (language === 'javascript') {
    return prepareJavaScriptCode(code);
  }

  return code;
}

function preparePythonCode(code) {
  const hasTyping = code.includes('typing') || code.includes('from typing');
  const hasTreeNode = code.includes('class TreeNode');
  const hasListNode = code.includes('class ListNode');

  let preamble = '';

  // Auto-inject typing imports if not already imported
  preamble += `import sys, math, heapq, bisect, json, collections\n`;
  preamble += `from typing import Optional, List, Dict, Set, Tuple, Union, Any, Deque, DefaultDict\n`;
  preamble += `from collections import deque, defaultdict, Counter\n\n`;

  if (!hasListNode) {
    preamble += `class ListNode:\n`;
    preamble += `    def __init__(self, val=0, next=None):\n`;
    preamble += `        self.val = val\n`;
    preamble += `        self.next = next\n\n`;
  }

  if (!hasTreeNode) {
    preamble += `class TreeNode:\n`;
    preamble += `    def __init__(self, val=0, left=None, right=None):\n`;
    preamble += `        self.val = val\n`;
    preamble += `        self.left = left\n`;
    preamble += `        self.right = right\n\n`;
  }

  // Check if code has a Solution class but NO custom __main__ / stdin runner
  const hasSolutionClass = /class\s+Solution\b/.test(code);
  const hasMain = /if\s+__name__\s*==\s*['"]__main__['"]/.test(code) || /sys\.stdin\.read/.test(code);

  let harness = '';
  if (hasSolutionClass && !hasMain) {
    harness = `
# ==========================================
# AUTO-GENERATED LEETCODE RUNTIME HARNESS
# ==========================================
if __name__ == "__main__":
    import inspect
    sol = Solution()
    methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
    if methods:
        method_name = methods[0]
        func = getattr(sol, method_name)
        raw_input = sys.stdin.read().strip()

        def parse_json_safely(s):
            s = s.strip()
            if not s:
                return None
            try:
                return json.loads(s)
            except Exception:
                return s

        def parse_tree(val):
            if not isinstance(val, list) or not val:
                return None
            root = TreeNode(val[0])
            q = deque([root])
            i = 1
            while q and i < len(val):
                curr = q.popleft()
                if i < len(val) and val[i] is not None:
                    curr.left = TreeNode(val[i])
                    q.append(curr.left)
                i += 1
                if i < len(val) and val[i] is not None:
                    curr.right = TreeNode(val[i])
                    q.append(curr.right)
                i += 1
            return root

        def serialize_tree(root):
            if not root:
                return []
            res = []
            q = deque([root])
            while q:
                curr = q.popleft()
                if curr:
                    res.append(curr.val)
                    q.append(curr.left)
                    q.append(curr.right)
                else:
                    res.append(None)
            while res and res[-1] is None:
                res.pop()
            return res

        def parse_list(val):
            if not isinstance(val, list) or not val:
                return None
            head = ListNode(val[0])
            curr = head
            for x in val[1:]:
                curr.next = ListNode(x)
                curr = curr.next
            return head

        def serialize_list(node):
            res = []
            while node:
                res.append(node.val)
                node = node.next
            return res

        # Split input into lines or JSON chunks
        raw_lines = [l.strip() for l in raw_input.split('\\n') if l.strip()]
        args = [parse_json_safely(l) for l in raw_lines]

        # Inspect parameters to convert to Tree / List if needed
        sig = inspect.signature(func)
        param_names = list(sig.parameters.keys())
        processed_args = []
        for i, val in enumerate(args[:len(param_names)]):
            pname = param_names[i].lower()
            if 'root' in pname or 'tree' in pname:
                processed_args.append(parse_tree(val) if isinstance(val, list) else val)
            elif 'head' in pname or 'list' in pname:
                processed_args.append(parse_list(val) if isinstance(val, list) else val)
            else:
                processed_args.append(val)

        try:
            result = func(*processed_args)
            if isinstance(result, TreeNode):
                print(json.dumps(serialize_tree(result), separators=(',', ':')))
            elif isinstance(result, ListNode):
                print(json.dumps(serialize_list(result), separators=(',', ':')))
            elif isinstance(result, bool):
                print("true" if result else "false")
            elif isinstance(result, (list, dict, int, float, str)):
                print(json.dumps(result, separators=(',', ':')))
            elif result is None:
                # If function operates on a tree or list, empty is []
                first_p = param_names[0].lower() if param_names else ""
                if 'root' in first_p or 'tree' in first_p or 'head' in first_p:
                    print("[]")
                else:
                    print("null")
            else:
                print(result)
        except Exception as e:
            sys.stderr.write(f"Runtime error in {method_name}: {e}\\n")
            sys.exit(1)
`;
  }

  return preamble + code + harness;
}

function prepareJavaScriptCode(code) {
  let preamble = `
// Standard LeetCode Data Structures
function ListNode(val, next) {
    this.val = (val===undefined ? 0 : val);
    this.next = (next===undefined ? null : next);
}

function TreeNode(val, left, right) {
    this.val = (val===undefined ? 0 : val);
    this.left = (left===undefined ? null : left);
    this.right = (right===undefined ? null : right);
}
\n`;

  return preamble + code;
}
