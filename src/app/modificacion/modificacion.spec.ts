import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modificacion } from './modificacion';

describe('Modificacion', () => {
  let component: Modificacion;
  let fixture: ComponentFixture<Modificacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modificacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Modificacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
