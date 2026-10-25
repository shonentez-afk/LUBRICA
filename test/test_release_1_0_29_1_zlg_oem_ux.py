from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'lubrication/task-editor.js').read_text()
assert 'data-zlg-simple-note' in s
assert 'Уровень OEM-методики ZLG' in s
assert 'OEM конкретного вентилятора / узла' in s
assert 'NTN-SNR ZLG — общая инструкция корпуса 2024' in s
assert "zlgServiceMode" in s
print('ZLG OEM UX TEST PASS')
