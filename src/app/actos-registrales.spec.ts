import { TestBed } from '@angular/core/testing';

import { ActosRegistrales } from './actos-registrales';

describe('ActosRegistrales', () => {
  let service: ActosRegistrales;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActosRegistrales);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
