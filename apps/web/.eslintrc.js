module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.name='fetch'] Literal[value=/^https?:\\/\\//]",
        message: 'Do not use absolute http(s) URLs in client code. Use /api/...'
      }
    ]
  }
}

