import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Nacimiento } from './nacimiento';

describe('Nacimiento', () => {
  let component: Nacimiento;
  let fixture: ComponentFixture<Nacimiento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Nacimiento]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Nacimiento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
