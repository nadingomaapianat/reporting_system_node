import { extractPermissionsFromValidateBody } from './extract-permissions-from-validate';

describe('extractPermissionsFromValidateBody', () => {
  it('reads flat permissions', () => {
    const rows = [{ page: 'Dashboard', show: true }];
    expect(extractPermissionsFromValidateBody({ permissions: rows })).toEqual(rows);
  });

  it('reads user.permissions', () => {
    const rows = [{ page: 'Tasks' }];
    expect(
      extractPermissionsFromValidateBody({
        user_id: 1,
        user: { permissions: rows },
      }),
    ).toEqual(rows);
  });

  it('matches group catalog in data[]', () => {
    const rows = [{ page: 'Reports', show: true }];
    const body = {
      group_id: 5,
      data: [
        { group_id: 1, permissions: [{ page: 'X' }] },
        { group_id: 5, permissions: rows },
      ],
    };
    expect(extractPermissionsFromValidateBody(body)).toEqual(rows);
  });

  it('returns null when nothing matches', () => {
    expect(
      extractPermissionsFromValidateBody({
        group_id: 99,
        data: [{ group_id: 1, permissions: [{ page: 'A' }] }],
      }),
    ).toBeNull();
  });
});
