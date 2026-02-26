import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cancelaciones } from './cancelaciones';

describe('Cancelaciones', () => {
  let component: Cancelaciones;
  let fixture: ComponentFixture<Cancelaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cancelaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cancelaciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
