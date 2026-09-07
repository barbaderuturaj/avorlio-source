from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/public-slot-selection.spec.ts")
s = p.read_text(encoding="utf-8")

needle = 'test("reports only genuinely missing public booking fields"'
pos = s.find(needle)

if pos == -1:
    raise SystemExit("target test not found")

# Insert at the beginning of that test's line.
line_start = s.rfind("\n", 0, pos) + 1

test = '''    test("recovers a natural issue answer from the assistant intake question", () => {
      const intakeFields = [
        { id: "issue_type", label: "What's happening?", required: true },
      ];

      const fields = recoverPublicBookingFieldsFromTurns([
        {
          role: "assistant",
          content: buildPublicBookingFieldQuestion(intakeFields[0]!),
        },
        {
          role: "user",
          content: "AC not cooling",
        },
      ], intakeFields);

      assert.equal(fields.intakeResponses?.issue_type, "AC not cooling");
      assert.equal(
        getRecoveredBookingFieldValue(fields, "issue_type"),
        "AC not cooling",
      );
      assert.deepEqual(
        missingPublicBookingFields(fields, intakeFields),
        ["name", "phone or email"],
      );
    });

'''

s = s[:line_start] + test + s[line_start:]
p.write_text(s, encoding="utf-8")

print("PASS: natural issue-answer regression added")
