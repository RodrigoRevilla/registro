import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reimpresiones } from './reimpresiones';

describe('Reimpresiones', () => {
  let component: Reimpresiones;
  let fixture: ComponentFixture<Reimpresiones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reimpresiones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reimpresiones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
