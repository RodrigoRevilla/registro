import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Matrimonios } from './matrimonios';

describe('Matrimonios', () => {
  let component: Matrimonios;
  let fixture: ComponentFixture<Matrimonios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Matrimonios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Matrimonios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
