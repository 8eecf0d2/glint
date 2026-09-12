import assert from 'node:assert/strict';
import test from 'node:test';
import { initialLayout, regions, planRelocation } from '../src/windowLayout.ts';

function clear(rectangles) {
  rectangles.forEach((a, i) => {
    assert.ok(a.x >= -1e-9 && a.y >= -1e-9 && a.width > 0 && a.height > 0);
    assert.ok(a.x + a.width <= 1 + 1e-9 && a.y + a.height <= 1 + 1e-9);
    rectangles.slice(i + 1).forEach((b) => {
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      assert.ok(width <= 1e-9 || height <= 1e-9, 'regions must not overlap');
    });
  });
}

test('growing top-left to 75% gives top-right 25%, leaving the lower area unchanged', () => {
  const layout = initialLayout();
  const before = regions(layout);
  const after = regions({ ...layout, top: 0.75 });
  assert.equal(after[0].width, 0.75);
  assert.equal(after[1].x, 0.75);
  assert.equal(after[1].width, 0.25);
  assert.deepEqual(after.slice(2), before.slice(2));
  clear(after);
});

test('vertical neighbors respond together, and nested windows retain minimum sizes', () => {
  const layout = { ...initialLayout(), rows: 0.6, lowerLeft: 0.6 };
  const mobile = regions(layout, true);
  assert.ok(Math.abs(mobile[0].height - 0.6) < 1e-9);
  assert.ok(Math.abs(mobile[1].height - 0.4) < 1e-9);
  const desktop = regions(layout);
  desktop.forEach((rect) => assert.ok(rect.height >= 0.2 - 1e-9));
  clear(desktop);
});

test('random boundary transitions stay clear throughout resizing, at narrow and wide sizes', () => {
  let seed = 4281;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const compact of [false, true]) {
    for (const minWidth of [0.04, 0.12, 0.2]) {
      let previous = regions(initialLayout(), compact, minWidth);
      for (let trial = 0; trial < 300; trial++) {
        const layout = Object.fromEntries(Object.keys(initialLayout()).map((key) => [key, random()]));
        const next = regions(layout, compact, minWidth);
        next.forEach((rect) => {
          assert.ok(rect.width >= minWidth - 1e-9);
          assert.ok(Math.abs(rect.width * 4 - Math.round(rect.width * 4)) < 1e-9, 'widths use quarter-screen steps');
          assert.ok(Math.abs(rect.height * 5 - Math.round(rect.height * 5)) < 1e-9, 'heights use 20% steps');
          assert.ok(rect.height >= 0.2 - 1e-9);
        });
        for (let frame = 0; frame <= 10; frame++) {
          const t = frame / 10;
          clear(next.map((rect, i) => Object.fromEntries(Object.keys(rect)
            .map((key) => [key, previous[i][key] * (1 - t) + rect[key] * t]))));
        }
        previous = next;
      }
    }
  }
});

test('occupied destinations are cleared before arrival, without colliding reservations', () => {
  for (let vacancy = 0; vacancy < 6; vacancy++) {
    const owners = Array.from({ length: 6 }, (_, id) => ({ id, slot: id })).filter(({ slot }) => slot !== vacancy);
    for (const source of owners) {
      for (let target = 0; target < 6; target++) {
        const stages = planRelocation(owners, source.id, target, 6);
        let current = owners.map((entry) => ({ ...entry }));
        stages.forEach((stage) => {
          stage.forEach((move) => {
            assert.ok(!current.some((owner) => owner.slot === move.slot), 'arrival must already be vacant');
            current.find((owner) => owner.id === move.id).slot = move.slot;
          });
          assert.equal(new Set(current.map(({ slot }) => slot)).size, current.length);
        });
        assert.equal(current.find(({ id }) => id === source.id).slot, target);
      }
    }
  }
  assert.deepEqual(planRelocation([{ id: 0, slot: 0 }, { id: 1, slot: 1 }], 0, 1, 2), []);
});

test('continuous study partitions follow arbitrary cursor positions without snapping and respect bounds', () => {
  for (const compact of [false, true]) {
    for (const minWidth of [0.08, 0.2]) {
      for (let i = -100; i <= 1100; i++) {
        const x = i / 1000;
        const cells = regions({ ...initialLayout(), top: x, bottom: x, rows: x }, compact, minWidth, 0.2, false);
        clear(cells);
        cells.forEach((rect) => {
          assert.ok(rect.width >= minWidth - 1e-9);
          assert.ok(rect.height >= 0.2 - 1e-9);
        });
        if (!compact && x >= minWidth && x <= 1 - minWidth) {
          assert.ok(Math.abs(cells[0].width - x) < 1e-9, 'width follows the exact requested position');
        }
        if (compact && x >= 0.2 && x <= 0.8) {
          assert.ok(Math.abs(cells[0].height - x) < 1e-9, 'height follows the exact requested position');
        }
      }
    }
  }
});

test('local shared resizing preserves contact, bounds, vacancies and distant geometry', async () => {
  const { initialLooseLayout, looseWindowCells, followLooseLayout } = await import('../src/localWindowLayout.ts');
  let seed = 7919;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const layout = initialLooseLayout(random);
  const before = looseWindowCells(layout).slice(6);
  followLooseLayout(layout, 0.35, 0.2, 0, 1);
  const topWidth = layout.columns[0];
  followLooseLayout(layout, 0.13, 0.6, 1, 1);
  assert.equal(layout.columns[0], topWidth);
  assert.deepEqual(looseWindowCells(layout).slice(6), before);
  for (let i = 0; i < 2000; i++) {
    followLooseLayout(layout, random(), random(), i % 3, 0.4);
    const cells = looseWindowCells(layout);
    clear(cells);
    assert.equal(cells.length, 12);
    cells.forEach((cell) => { assert.ok(cell.width >= 0.125 - 1e-9); assert.ok(cell.height >= 0.18 - 1e-9); });
    for (let j = 0; j < 12; j += 2) {
      assert.ok(Math.abs(cells[j].x + cells[j].width - cells[j + 1].x) < 1e-9);
      assert.equal(cells[j].y, cells[j + 1].y);
      assert.equal(cells[j].height, cells[j + 1].height);
    }
    const occupied = [0, 1, 3, 5, 6, 8, 10, 11].map((slot, id) => ({ id, slot }));
    const target = [2, 4, 7, 9][i % 4];
    assert.deepEqual(planRelocation(occupied, i % 8, target, 12), [[{ id: i % 8, slot: target }]]);
  }
});

test('rounded window mesh retains valid triangles and fixed buffers during repeated hover resizing', async () => {
  const { createRoundedWindowGeometry, updateRoundedWindowGeometry } = await import('../src/roundedWindowGeometry.ts');
  const geometry = createRoundedWindowGeometry();
  const position = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  for (let frame = 0; frame < 1500; frame++) {
    const width = 0.6 + (1 + Math.sin(frame * 0.17)) * 4;
    const height = 0.5 + (1 + Math.cos(frame * 0.13)) * 3;
    updateRoundedWindowGeometry(geometry, width, height, 0.18);
    assert.equal(geometry.getAttribute('position'), position);
    assert.equal(geometry.getIndex(), indices);
    for (let i = 0; i < position.count; i++) {
      assert.ok(Number.isFinite(position.getX(i)) && Number.isFinite(position.getY(i)));
      assert.ok(Math.abs(position.getX(i)) <= width / 2 + 1e-6);
      assert.ok(Math.abs(position.getY(i)) <= height / 2 + 1e-6);
    }
    for (let i = 0; i < indices.count; i += 3) {
      const b = indices.getX(i + 1), c = indices.getX(i + 2);
      assert.ok(position.getX(b) * position.getY(c) - position.getY(b) * position.getX(c) > 0, 'triangles retain positive winding');
    }
  }
  geometry.dispose();
});
