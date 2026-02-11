import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Certificacion } from './certificacion';

describe('Certificacion', () => {
  let component: Certificacion;
  let fixture: ComponentFixture<Certificacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Certificacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Certificacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
